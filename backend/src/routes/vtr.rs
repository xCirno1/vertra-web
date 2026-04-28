use axum::{
    body::Bytes,
    extract::{Path, State},
    http::{header, StatusCode},
    response::Response,
    Json,
};
use aws_sdk_s3::error::SdkError;
use uuid::Uuid;

use crate::{
    errors::{ApiResult, AppError},
    middleware::auth::AuthUser,
    models::OkResponse,
    state::AppState,
};

/// `PUT /api/vtr/:project_id`
///
/// Accepts a raw binary `.vtr` body, verifies project ownership, then uploads
/// the file to Cloudflare R2 at key `vtr/{project_id}.vtr`.
pub async fn upload_vtr(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    body: Bytes,
) -> ApiResult<Json<OkResponse>> {
    // Verify the authenticated user owns this project.
    let exists: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM projects WHERE id = $1 AND owner_id = $2",
    )
    .bind(project_id)
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await?;

    if exists.is_none() {
        return Err(AppError::NotFound);
    }

    let key = format!("vtr/{}.vtr", project_id);

    state
        .s3
        .put_object()
        .bucket(&state.config.r2_bucket_name)
        .key(&key)
        .body(aws_sdk_s3::primitives::ByteStream::from(body.to_vec()))
        .content_type("application/octet-stream")
        .content_length(body.len() as i64)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("R2 put_object error for key {key}: {e}");
            AppError::Internal
        })?;

    Ok(Json(OkResponse { ok: true }))
}

/// `GET /api/vtr/:project_id`
///
/// Verifies project ownership, then fetches the `.vtr` file from Cloudflare R2
/// and streams it back as `application/octet-stream`.
pub async fn download_vtr(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
) -> Result<Response, AppError> {
    // Verify the authenticated user owns this project.
    let exists: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM projects WHERE id = $1 AND owner_id = $2",
    )
    .bind(project_id)
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await?;

    if exists.is_none() {
        return Err(AppError::NotFound);
    }

    let key = format!("vtr/{}.vtr", project_id);

    let output = state
        .s3
        .get_object()
        .bucket(&state.config.r2_bucket_name)
        .key(&key)
        .send()
        .await
        .map_err(|e| {
            if let SdkError::ServiceError(ref se) = e {
                if se.err().is_no_such_key() {
                    return AppError::NotFound;
                }
            }
            tracing::error!("R2 get_object error for key {key}: {e}");
            AppError::Internal
        })?;

    let data = output
        .body
        .collect()
        .await
        .map_err(|e| {
            tracing::error!("Error reading R2 body for key {key}: {e}");
            AppError::Internal
        })?;

    let bytes = data.into_bytes();

    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/octet-stream")
        .header(header::CONTENT_LENGTH, bytes.len())
        .body(axum::body::Body::from(bytes))
        .map_err(|_| AppError::Internal)?;

    Ok(response)
}

/// `GET /api/vtr/s/:token`
///
/// Downloads the VTR scene snapshot for a published project using its share
/// token.  No authentication required — the project must be published.
pub async fn download_public_vtr(
    State(state): State<AppState>,
    Path(token): Path<String>,
) -> Result<Response, AppError> {
    // Resolve the project id from the publish token.
    let row: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM projects WHERE published_token = $1 AND is_published = true",
    )
    .bind(&token)
    .fetch_optional(&state.db)
    .await?;

    let (project_id,) = row.ok_or(AppError::NotFound)?;

    let key = format!("vtr/{}.vtr", project_id);

    let output = state
        .s3
        .get_object()
        .bucket(&state.config.r2_bucket_name)
        .key(&key)
        .send()
        .await
        .map_err(|e| {
            if let SdkError::ServiceError(ref se) = e {
                if se.err().is_no_such_key() {
                    return AppError::NotFound;
                }
            }
            tracing::error!("R2 get_object error for key {key}: {e}");
            AppError::Internal
        })?;

    let data = output
        .body
        .collect()
        .await
        .map_err(|e| {
            tracing::error!("Error reading R2 body for key {key}: {e}");
            AppError::Internal
        })?;

    let bytes = data.into_bytes();

    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/octet-stream")
        .header(header::CONTENT_LENGTH, bytes.len())
        .body(axum::body::Body::from(bytes))
        .map_err(|_| AppError::Internal)?;

    Ok(response)
}
