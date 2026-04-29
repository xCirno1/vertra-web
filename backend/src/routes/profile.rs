use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    Json,
};
use aws_sdk_s3::presigning::PresigningConfig;
use chrono::Utc;
use std::time::Duration;
use uuid::Uuid;

use crate::{
    errors::{ApiResult, AppError},
    middleware::auth::AuthUser,
    models::{FullProfileDto, FullProfileResponse, ProfileRow, UpdateProfileRequest},
    state::AppState,
};

const MAX_AVATAR_BYTES: usize = 4 * 1024 * 1024; // 4 MB

const ALLOWED_AVATAR_MIME: &[&str] = &[
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
];

/// `GET /profile`
///
/// Returns the full extended profile for the authenticated user.
pub async fn get_profile(
    auth: AuthUser,
    State(state): State<AppState>,
) -> ApiResult<Json<FullProfileResponse>> {
    let row: Option<ProfileRow> = sqlx::query_as(
        "SELECT id, email, name, avatar, bio, website, location,
                banner_color, avatar_r2_key, profile_settings,
                created_at, updated_at
         FROM users WHERE id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await?;

    let row = row.ok_or(AppError::NotFound)?;

    Ok(Json(FullProfileResponse { user: FullProfileDto::from(row) }))
}

/// `PATCH /profile`
///
/// Updates mutable profile fields. All fields are optional; only non-null
/// values in the request body are applied.
pub async fn update_profile(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(body): Json<UpdateProfileRequest>,
) -> ApiResult<Json<FullProfileResponse>> {
    // Validate URL if provided.
    if let Some(ref url) = body.website {
        if !url.is_empty() && !url.starts_with("http://") && !url.starts_with("https://") {
            return Err(AppError::BadRequest(
                "website must be a valid URL starting with http:// or https://".into(),
            ));
        }
    }

    // Validate banner_color is a CSS hex color if provided.
    if let Some(ref color) = body.banner_color {
        if !is_valid_hex_color(color) {
            return Err(AppError::BadRequest(
                "banner_color must be a valid hex color (e.g. #1dd4f6)".into(),
            ));
        }
    }

    let now = Utc::now();

    let row: Option<ProfileRow> = sqlx::query_as(
        "UPDATE users
         SET
             name             = COALESCE($2, name),
             bio              = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE bio END,
             website          = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE website END,
             location         = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE location END,
             banner_color     = COALESCE($6, banner_color),
             profile_settings = CASE WHEN $7::jsonb IS NOT NULL THEN $7 ELSE profile_settings END,
             updated_at       = $8
         WHERE id = $1
         RETURNING id, email, name, avatar, bio, website, location,
                   banner_color, avatar_r2_key, profile_settings,
                   created_at, updated_at",
    )
    .bind(auth.user_id)
    .bind(&body.name)
    .bind(&body.bio)
    .bind(&body.website)
    .bind(&body.location)
    .bind(&body.banner_color)
    .bind(body.profile_settings.as_ref())
    .bind(now)
    .fetch_optional(&state.db)
    .await?;

    let row = row.ok_or(AppError::NotFound)?;

    Ok(Json(FullProfileResponse { user: FullProfileDto::from(row) }))
}

/// `POST /profile/avatar`
///
/// Accepts a multipart form with a single `file` field (PNG / JPEG / WebP / GIF, ≤ 4 MB).
/// Uploads to R2 under `avatars/<user_id>.<ext>`, stores the key in `avatar_r2_key`,
/// and updates `avatar` with a presigned URL valid for 7 days.
pub async fn upload_avatar(
    auth: AuthUser,
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> ApiResult<(StatusCode, Json<FullProfileResponse>)> {
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut mime_type: Option<String> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        tracing::warn!("Multipart field error: {e}");
        AppError::BadRequest("Invalid multipart body".into())
    })? {
        if field.name().unwrap_or("") == "file" {
            mime_type = field.content_type().map(|s| s.to_string());
            let data = field.bytes().await.map_err(|e| {
                tracing::warn!("Failed to read avatar bytes: {e}");
                AppError::BadRequest("Failed to read file data".into())
            })?;

            if data.len() > MAX_AVATAR_BYTES {
                return Err(AppError::BadRequest(format!(
                    "Avatar exceeds maximum size of {} MB",
                    MAX_AVATAR_BYTES / (1024 * 1024)
                )));
            }

            file_bytes = Some(data.to_vec());
        } else {
            let _ = field.bytes().await;
        }
    }

    let file_bytes = file_bytes
        .ok_or_else(|| AppError::BadRequest("Missing 'file' field".into()))?;
    let mime_type = mime_type.unwrap_or_else(|| "application/octet-stream".to_string());

    if !ALLOWED_AVATAR_MIME.contains(&mime_type.as_str()) {
        return Err(AppError::BadRequest(format!(
            "Unsupported avatar type '{}'. Allowed: png, jpeg, webp, gif",
            mime_type
        )));
    }

    let ext = extension_for_mime(&mime_type);
    let r2_key = format!("avatars/{}.{}", auth.user_id, ext);
    let size_bytes = file_bytes.len() as i64;

    // Delete previous avatar object if it had a different extension.
    // Best-effort; don't fail the request if it errors.
    let _ = delete_old_avatar(&state, auth.user_id, &r2_key).await;

    // Upload new avatar to R2.
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
            tracing::error!("R2 put_object error for avatar {}: {e}", auth.user_id);
            AppError::Internal
        })?;

    // Generate a presigned URL valid for 7 days to use as the public avatar URL.
    let presign_cfg = PresigningConfig::expires_in(Duration::from_secs(7 * 24 * 3600))
        .map_err(|_| AppError::Internal)?;

    let presigned = state
        .s3
        .get_object()
        .bucket(&state.config.r2_bucket_name)
        .key(&r2_key)
        .presigned(presign_cfg)
        .await
        .map_err(|e| {
            tracing::error!("R2 presign error for avatar {}: {e}", auth.user_id);
            AppError::Internal
        })?;

    let avatar_url = presigned.uri().to_string();
    let now = Utc::now();

    // Persist key + presigned URL in the DB.
    let row: Option<ProfileRow> = sqlx::query_as(
        "UPDATE users
         SET avatar_r2_key = $2, avatar = $3, updated_at = $4
         WHERE id = $1
         RETURNING id, email, name, avatar, bio, website, location,
                   banner_color, avatar_r2_key, profile_settings,
                   created_at, updated_at",
    )
    .bind(auth.user_id)
    .bind(&r2_key)
    .bind(&avatar_url)
    .bind(now)
    .fetch_optional(&state.db)
    .await?;

    let row = row.ok_or(AppError::NotFound)?;

    Ok((StatusCode::OK, Json(FullProfileResponse { user: FullProfileDto::from(row) })))
}

/// `DELETE /profile/avatar`
///
/// Removes the avatar from R2 and clears the avatar fields on the user row.
pub async fn delete_avatar(
    auth: AuthUser,
    State(state): State<AppState>,
) -> ApiResult<Json<FullProfileResponse>> {
    // Fetch the current r2 key.
    let existing: Option<(Option<String>,)> =
        sqlx::query_as("SELECT avatar_r2_key FROM users WHERE id = $1")
            .bind(auth.user_id)
            .fetch_optional(&state.db)
            .await?;

    if let Some((Some(key),)) = existing {
        let _ = state
            .s3
            .delete_object()
            .bucket(&state.config.r2_bucket_name)
            .key(&key)
            .send()
            .await;
    }

    let now = Utc::now();
    let row: Option<ProfileRow> = sqlx::query_as(
        "UPDATE users
         SET avatar = NULL, avatar_r2_key = NULL, updated_at = $2
         WHERE id = $1
         RETURNING id, email, name, avatar, bio, website, location,
                   banner_color, avatar_r2_key, profile_settings,
                   created_at, updated_at",
    )
    .bind(auth.user_id)
    .bind(now)
    .fetch_optional(&state.db)
    .await?;

    let row = row.ok_or(AppError::NotFound)?;
    Ok(Json(FullProfileResponse { user: FullProfileDto::from(row) }))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn extension_for_mime(mime: &str) -> &'static str {
    match mime {
        "image/jpeg" => "jpg",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "png",
    }
}

fn is_valid_hex_color(s: &str) -> bool {
    if !s.starts_with('#') {
        return false;
    }
    let rest = &s[1..];
    (rest.len() == 3 || rest.len() == 6) && rest.chars().all(|c| c.is_ascii_hexdigit())
}

/// Best-effort delete of any existing avatar under a different extension.
async fn delete_old_avatar(
    state: &AppState,
    user_id: Uuid,
    new_key: &str,
) -> Result<(), ()> {
    for ext in &["png", "jpg", "webp", "gif"] {
        let candidate = format!("avatars/{}.{}", user_id, ext);
        if candidate != new_key {
            let _ = state
                .s3
                .delete_object()
                .bucket(&state.config.r2_bucket_name)
                .key(&candidate)
                .send()
                .await;
        }
    }
    Ok(())
}
