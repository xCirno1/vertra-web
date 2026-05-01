use axum::{
    body::Bytes,
    extract::{Path, State},
    http::{header, StatusCode},
    response::Response,
    Json,
};
use aws_sdk_s3::error::SdkError;
use aws_sdk_s3::operation::get_object::GetObjectError;
use uuid::Uuid;

use crate::{
    errors::{ApiResult, AppError},
    middleware::auth::AuthUser,
    models::OkResponse,
    state::AppState,
};

/// S3 key for a project's script VFS blob.
fn scripts_key(project_id: Uuid) -> String {
    format!("scripts/{}.json", project_id)
}

/// Verify that `project_id` is owned by the authenticated user.
/// Returns `AppError::NotFound` if the project does not exist or belongs to another user.
async fn assert_ownership(
    state: &AppState,
    project_id: Uuid,
    user_id: Uuid,
) -> Result<(), AppError> {
    let exists: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM projects WHERE id = $1 AND owner_id = $2",
    )
    .bind(project_id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await?;

    if exists.is_none() {
        return Err(AppError::NotFound);
    }
    Ok(())
}

/// `GET /api/scripts/:project_id`
///
/// Returns the project's script VFS blob (a JSON object) from R2.
/// Responds with 404 if no scripts have been saved for this project yet.
pub async fn download_scripts(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
) -> Result<Response, AppError> {
    assert_ownership(&state, project_id, auth.user_id).await?;

    let key = scripts_key(project_id);

    let result = state
        .s3
        .get_object()
        .bucket(&state.config.r2_bucket_name)
        .key(&key)
        .send()
        .await;

    match result {
        Ok(output) => {
            let bytes = output
                .body
                .collect()
                .await
                .map_err(|e| {
                    tracing::error!("R2 body collect error for key {key}: {e}");
                    AppError::Internal
                })?
                .into_bytes();

            Ok(Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "application/json")
                .body(axum::body::Body::from(bytes))
                .unwrap())
        }
        Err(SdkError::ServiceError(svc)) if matches!(svc.err(), GetObjectError::NoSuchKey(_)) => {
            Err(AppError::NotFound)
        }
        Err(e) => {
            tracing::error!("R2 get_object error for key {key}: {e}");
            Err(AppError::Internal)
        }
    }
}

/// `GET /api/scripts/s/:token`
///
/// Returns the published project's script VFS blob from R2 using the share
/// token. No authentication required.
pub async fn download_public_scripts(
    State(state): State<AppState>,
    Path(token): Path<String>,
) -> Result<Response, AppError> {
    let row: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM projects WHERE published_token = $1 AND is_published = true",
    )
    .bind(&token)
    .fetch_optional(&state.db)
    .await?;

    let (project_id,) = row.ok_or(AppError::NotFound)?;
    let key = scripts_key(project_id);

    let result = state
        .s3
        .get_object()
        .bucket(&state.config.r2_bucket_name)
        .key(&key)
        .send()
        .await;

    match result {
        Ok(output) => {
            let bytes = output
                .body
                .collect()
                .await
                .map_err(|e| {
                    tracing::error!("R2 body collect error for key {key}: {e}");
                    AppError::Internal
                })?
                .into_bytes();

            Ok(Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "application/json")
                .body(axum::body::Body::from(bytes))
                .unwrap())
        }
        Err(SdkError::ServiceError(svc)) if matches!(svc.err(), GetObjectError::NoSuchKey(_)) => {
            Err(AppError::NotFound)
        }
        Err(e) => {
            tracing::error!("R2 get_object error for key {key}: {e}");
            Err(AppError::Internal)
        }
    }
}

/// `PUT /api/scripts/:project_id`
///
/// Accepts a raw JSON body (the `ScriptVfs` object) and stores it in R2 at
/// `scripts/{project_id}.json`.
///
/// Maximum body size is enforced by Axum's `DefaultBodyLimit` at the router level (10 MB).
pub async fn upload_scripts(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    body: Bytes,
) -> ApiResult<Json<OkResponse>> {
    assert_ownership(&state, project_id, auth.user_id).await?;

    // Validate that the body is valid JSON before storing.
    serde_json::from_slice::<serde_json::Value>(&body)
        .map_err(|_| AppError::BadRequest("Body must be valid JSON".into()))?;

    let key = scripts_key(project_id);
    let len = body.len() as i64;

    state
        .s3
        .put_object()
        .bucket(&state.config.r2_bucket_name)
        .key(&key)
        .body(aws_sdk_s3::primitives::ByteStream::from(body.to_vec()))
        .content_type("application/json")
        .content_length(len)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("R2 put_object error for key {key}: {e}");
            AppError::Internal
        })?;

    Ok(Json(OkResponse { ok: true }))
}
