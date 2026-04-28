use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    Json,
};
use aws_sdk_s3::presigning::PresigningConfig;
use serde::Deserialize;
use std::time::Duration;
use uuid::Uuid;
use chrono::Utc;

use crate::{
    errors::{ApiResult, AppError},
    middleware::auth::AuthUser,
    models::{OkResponse, PresignedUrlResponse, TextureDto, TextureRow, UpdateTextureRequest},
    state::AppState,
};

const MAX_TEXTURE_BYTES: usize = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES: &[&str] = &[
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
];

/// `POST /textures/upload`
///
/// Accepts a multipart form with:
/// - `file`       — the image bytes (required)
/// - `name`       — display name (required)
/// - `width`      — image width in pixels as string (optional)
/// - `height`     — image height in pixels as string (optional)
/// - `project_id` — UUID string; when present stores texture as project-local (optional)
///
/// Validates size (≤ 5 MB) and MIME type, uploads to R2, saves metadata to DB.
pub async fn upload_texture(
    auth: AuthUser,
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> ApiResult<(StatusCode, Json<TextureDto>)> {
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut file_name: Option<String> = None;
    let mut mime_type: Option<String> = None;
    let mut display_name: Option<String> = None;
    let mut width: Option<i32> = None;
    let mut height: Option<i32> = None;
    let mut project_id: Option<Uuid> = None;
    let mut is_public: bool = false;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        tracing::warn!("Multipart field error: {e}");
        AppError::BadRequest("Invalid multipart body".into())
    })? {
        let field_name = field.name().unwrap_or("").to_string();

        match field_name.as_str() {
            "file" => {
                file_name = field.file_name().map(|s| s.to_string());
                mime_type = field.content_type().map(|s| s.to_string());

                let data = field.bytes().await.map_err(|e| {
                    tracing::warn!("Failed to read multipart bytes: {e}");
                    AppError::BadRequest("Failed to read file data".into())
                })?;

                if data.len() > MAX_TEXTURE_BYTES {
                    return Err(AppError::BadRequest(format!(
                        "File exceeds maximum size of {} MB",
                        MAX_TEXTURE_BYTES / (1024 * 1024)
                    )));
                }

                file_bytes = Some(data.to_vec());
            }
            "name" => {
                display_name = Some(
                    field
                        .text()
                        .await
                        .map_err(|_| AppError::BadRequest("Invalid name field".into()))?,
                );
            }
            "width" => {
                let v = field
                    .text()
                    .await
                    .map_err(|_| AppError::BadRequest("Invalid width field".into()))?;
                width = v.trim().parse::<i32>().ok();
            }
            "height" => {
                let v = field
                    .text()
                    .await
                    .map_err(|_| AppError::BadRequest("Invalid height field".into()))?;
                height = v.trim().parse::<i32>().ok();
            }
            "project_id" => {
                let v = field
                    .text()
                    .await
                    .map_err(|_| AppError::BadRequest("Invalid project_id field".into()))?;
                let pid = v.trim().parse::<Uuid>().map_err(|_| {
                    AppError::BadRequest("project_id must be a valid UUID".into())
                })?;

                // Verify project ownership before accepting.
                let exists: Option<(Uuid,)> = sqlx::query_as(
                    "SELECT id FROM projects WHERE id = $1 AND owner_id = $2",
                )
                .bind(pid)
                .bind(auth.user_id)
                .fetch_optional(&state.db)
                .await?;

                if exists.is_none() {
                    return Err(AppError::NotFound);
                }

                project_id = Some(pid);
            }
            "is_public" => {
                let v = field
                    .text()
                    .await
                    .map_err(|_| AppError::BadRequest("Invalid is_public field".into()))?;
                is_public = matches!(v.trim(), "true" | "1");
            }
            _ => {
                // Drain unknown fields.
                let _ = field.bytes().await;
            }
        }
    }

    let file_bytes = file_bytes.ok_or_else(|| AppError::BadRequest("Missing 'file' field".into()))?;
    let file_name = file_name.unwrap_or_else(|| "texture".to_string());
    let display_name = display_name.unwrap_or_else(|| file_name.clone());
    let mime_type = mime_type.unwrap_or_else(|| "application/octet-stream".to_string());

    // Validate MIME type.
    if !ALLOWED_MIME_TYPES.contains(&mime_type.as_str()) {
        return Err(AppError::BadRequest(format!(
            "Unsupported file type '{}'. Allowed: png, jpeg, webp, gif",
            mime_type
        )));
    }

    let ext = extension_for_mime(&mime_type);
    let texture_id = Uuid::new_v4();
    let size_bytes = file_bytes.len() as i64;

    // Build R2 storage key.
    let r2_key = match project_id {
        Some(pid) => format!("textures/projects/{}/{}.{}", pid, texture_id, ext),
        None => format!("textures/{}/{}.{}", auth.user_id, texture_id, ext),
    };

    // Upload to Cloudflare R2.
    state
        .s3
        .put_object()
        .bucket(&state.config.r2_bucket_name)
        .key(&r2_key)
        .body(aws_sdk_s3::primitives::ByteStream::from(file_bytes))
        .content_type(&mime_type)
        .content_length(size_bytes)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("R2 put_object error for texture {texture_id}: {e}");
            AppError::Internal
        })?;

    let now = Utc::now();

    // Insert metadata into DB.
    let row: TextureRow = sqlx::query_as(
        "INSERT INTO textures
            (id, owner_id, project_id, name, file_name, mime_type, size_bytes, width, height, r2_key, created_at, is_public)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, owner_id, project_id, name, file_name, mime_type, size_bytes, width, height, r2_key, created_at, is_public",
    )
    .bind(texture_id)
    .bind(auth.user_id)
    .bind(project_id)
    .bind(&display_name)
    .bind(&file_name)
    .bind(&mime_type)
    .bind(size_bytes)
    .bind(width)
    .bind(height)
    .bind(&r2_key)
    .bind(now)
    .bind(is_public)
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(TextureDto::from(row))))
}

/// Query parameters for `GET /textures`.
#[derive(Debug, Deserialize)]
pub struct ListTexturesQuery {
    /// When present, also return project-local textures for this project.
    pub project_id: Option<Uuid>,
    /// When true, also return public textures from other users.
    pub include_public: Option<bool>,
}

/// `GET /textures`
///
/// Returns textures visible to the caller:
/// - Always returns all textures owned by the caller.
/// - When `?project_id=<uuid>` is also supplied (studio panel), only returns the
///   caller's global + project-local textures (ignores `include_public`).
/// - When `?include_public=true` is supplied (gallery page), also returns public
///   textures uploaded by other users.
pub async fn list_textures(
    auth: AuthUser,
    State(state): State<AppState>,
    Query(query): Query<ListTexturesQuery>,
) -> ApiResult<Json<Vec<TextureDto>>> {
    let rows: Vec<TextureRow> = match query.project_id {
        Some(pid) => {
            // Studio panel: own global + own project-X.
            sqlx::query_as(
                "SELECT id, owner_id, project_id, name, file_name, mime_type, size_bytes, width, height, r2_key, created_at, is_public
                 FROM textures
                 WHERE owner_id = $1 AND (project_id IS NULL OR project_id = $2)
                 ORDER BY created_at DESC",
            )
            .bind(auth.user_id)
            .bind(pid)
            .fetch_all(&state.db)
            .await?
        }
        None if query.include_public.unwrap_or(false) => {
            // Gallery page: all own textures + other users' public textures.
            sqlx::query_as(
                "SELECT id, owner_id, project_id, name, file_name, mime_type, size_bytes, width, height, r2_key, created_at, is_public
                 FROM textures
                 WHERE owner_id = $1 OR is_public = true
                 ORDER BY created_at DESC",
            )
            .bind(auth.user_id)
            .fetch_all(&state.db)
            .await?
        }
        None => {
            // Default: all own textures.
            sqlx::query_as(
                "SELECT id, owner_id, project_id, name, file_name, mime_type, size_bytes, width, height, r2_key, created_at, is_public
                 FROM textures
                 WHERE owner_id = $1
                 ORDER BY created_at DESC",
            )
            .bind(auth.user_id)
            .fetch_all(&state.db)
            .await?
        }
    };

    Ok(Json(rows.into_iter().map(TextureDto::from).collect()))
}

/// `GET /textures/:id/url`
///
/// Returns a short-lived (1 hour) presigned R2 GET URL for the given texture.
pub async fn get_texture_url(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(texture_id): Path<Uuid>,
) -> ApiResult<Json<PresignedUrlResponse>> {
    let row: Option<TextureRow> = sqlx::query_as(
        "SELECT id, owner_id, project_id, name, file_name, mime_type, size_bytes, width, height, r2_key, created_at, is_public
         FROM textures
         WHERE id = $1 AND owner_id = $2",
    )
    .bind(texture_id)
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await?;

    let row = row.ok_or(AppError::NotFound)?;

    let presign_config = PresigningConfig::expires_in(Duration::from_secs(3600))
        .map_err(|_| AppError::Internal)?;

    let presigned = state
        .s3
        .get_object()
        .bucket(&state.config.r2_bucket_name)
        .key(&row.r2_key)
        .presigned(presign_config)
        .await
        .map_err(|e| {
            tracing::error!("R2 presign error for texture {texture_id}: {e}");
            AppError::Internal
        })?;

    Ok(Json(PresignedUrlResponse {
        url: presigned.uri().to_string(),
    }))
}

/// `DELETE /textures/:id`
///
/// Deletes the texture from both R2 and the database.
pub async fn delete_texture(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(texture_id): Path<Uuid>,
) -> ApiResult<Json<OkResponse>> {
    let row: Option<TextureRow> = sqlx::query_as(
        "SELECT id, owner_id, project_id, name, file_name, mime_type, size_bytes, width, height, r2_key, created_at, is_public
         FROM textures
         WHERE id = $1 AND owner_id = $2",
    )
    .bind(texture_id)
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await?;

    let row = row.ok_or(AppError::NotFound)?;

    // Delete from R2 first; if this fails we keep the DB row to allow retry.
    state
        .s3
        .delete_object()
        .bucket(&state.config.r2_bucket_name)
        .key(&row.r2_key)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("R2 delete_object error for texture {texture_id}: {e}");
            AppError::Internal
        })?;

    sqlx::query("DELETE FROM textures WHERE id = $1")
        .bind(texture_id)
        .execute(&state.db)
        .await?;

    Ok(Json(OkResponse { ok: true }))
}

fn extension_for_mime(mime: &str) -> &'static str {
    match mime {
        "image/jpeg" => "jpg",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "png",
    }
}

/// `PATCH /textures/:id`
///
/// Updates mutable texture metadata (currently: `name`).
pub async fn update_texture(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(texture_id): Path<Uuid>,
    Json(body): Json<UpdateTextureRequest>,
) -> ApiResult<Json<TextureDto>> {
    // Confirm ownership.
    let row: Option<TextureRow> = sqlx::query_as(
        "SELECT id, owner_id, project_id, name, file_name, mime_type, size_bytes, width, height, r2_key, created_at, is_public
         FROM textures
         WHERE id = $1 AND owner_id = $2",
    )
    .bind(texture_id)
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await?;

    let row = row.ok_or(AppError::NotFound)?;

    let new_name = match body.name {
        Some(ref n) if !n.trim().is_empty() => n.trim().to_string(),
        _ => row.name.clone(),
    };

    let new_is_public = body.is_public.unwrap_or(row.is_public);

    let updated: TextureRow = sqlx::query_as(
        "UPDATE textures SET name = $1, is_public = $2 WHERE id = $3 AND owner_id = $4
         RETURNING id, owner_id, project_id, name, file_name, mime_type, size_bytes, width, height, r2_key, created_at, is_public",
    )
    .bind(&new_name)
    .bind(new_is_public)
    .bind(texture_id)
    .bind(auth.user_id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(TextureDto::from(updated)))
}
