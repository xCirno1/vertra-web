use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use uuid::Uuid;

use crate::{
    errors::{ApiResult, AppError},
    middleware::auth::AuthUser,
    models::{
        CreateProjectRequest, OkResponse, ProjectDto, ProjectRow,
        SyncProjectsRequest, SyncProjectsResponse, UpdateProjectRequest,
    },
    state::AppState,
};

/// `GET /projects`
///
/// Returns all projects owned by the authenticated user, ordered by most-recently
/// updated first.
pub async fn list_projects(
    auth: AuthUser,
    State(state): State<AppState>,
) -> ApiResult<Json<Vec<ProjectDto>>> {
    let rows: Vec<ProjectRow> = sqlx::query_as(
        "SELECT id, owner_id, name, description, thumbnail, scene, script, created_at, updated_at
         FROM projects
         WHERE owner_id = $1
         ORDER BY updated_at DESC",
    )
    .bind(auth.user_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows.into_iter().map(ProjectDto::from).collect()))
}

/// `GET /projects/:id`
///
/// Returns a single project.  The project must be owned by the caller.
pub async fn get_project(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
) -> ApiResult<Json<ProjectDto>> {
    let row: Option<ProjectRow> = sqlx::query_as(
        "SELECT id, owner_id, name, description, thumbnail, scene, script, created_at, updated_at
         FROM projects
         WHERE id = $1 AND owner_id = $2",
    )
    .bind(project_id)
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await?;

    row.map(ProjectDto::from)
        .map(Json)
        .ok_or(AppError::NotFound)
}

/// `POST /projects`
///
/// Creates a new project and returns it.
pub async fn create_project(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(body): Json<CreateProjectRequest>,
) -> ApiResult<(StatusCode, Json<ProjectDto>)> {
    if body.name.trim().is_empty() {
        return Err(AppError::BadRequest("Project name must not be empty".into()));
    }

    let now = Utc::now();
    let project_id = Uuid::new_v4();

    let row: ProjectRow = sqlx::query_as(
        "INSERT INTO projects (id, owner_id, name, description, thumbnail, scene, script, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, owner_id, name, description, thumbnail, scene, script, created_at, updated_at",
    )
    .bind(project_id)
    .bind(auth.user_id)
    .bind(body.name.trim())
    .bind(body.description.as_deref())
    .bind(body.thumbnail.as_deref())
    .bind(body.scene)
    .bind(body.script.as_deref())
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(ProjectDto::from(row))))
}

/// `PATCH /projects/:id`
///
/// Partially updates a project (only the supplied fields are changed).
pub async fn update_project(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Json(body): Json<UpdateProjectRequest>,
) -> ApiResult<Json<ProjectDto>> {
    // Verify ownership first.
    let existing: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM projects WHERE id = $1 AND owner_id = $2",
    )
    .bind(project_id)
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await?;

    if existing.is_none() {
        return Err(AppError::NotFound);
    }

    let now = Utc::now();

    let row: ProjectRow = sqlx::query_as(
        "UPDATE projects
         SET name        = COALESCE($3, name),
             description = COALESCE($4, description),
             thumbnail   = COALESCE($5, thumbnail),
             scene       = COALESCE($6, scene),
             script      = COALESCE($7, script),
             updated_at  = $8
         WHERE id = $1 AND owner_id = $2
         RETURNING id, owner_id, name, description, thumbnail, scene, script, created_at, updated_at",
    )
    .bind(project_id)
    .bind(auth.user_id)
    .bind(body.name.as_deref())
    .bind(body.description.as_deref())
    .bind(body.thumbnail.as_deref())
    .bind(body.scene)
    .bind(body.script.as_deref())
    .bind(now)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(ProjectDto::from(row)))
}

/// `DELETE /projects/:id`
///
/// Permanently deletes a project.
pub async fn delete_project(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
) -> ApiResult<Json<OkResponse>> {
    let result = sqlx::query(
        "DELETE FROM projects WHERE id = $1 AND owner_id = $2",
    )
    .bind(project_id)
    .bind(auth.user_id)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(Json(OkResponse { ok: true }))
}

/// `POST /projects/sync`
///
/// Batch-upsert multiple projects from the local store to the cloud.
/// Each project is upserted by `id` — if it already exists and is owned by
/// the same user, it is updated; otherwise a new row is inserted.
pub async fn sync_projects(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(body): Json<SyncProjectsRequest>,
) -> ApiResult<Json<SyncProjectsResponse>> {
    let mut synced = 0usize;

    for project in body.projects {
        if project.name.trim().is_empty() {
            continue;
        }

        let now = Utc::now();
        let project_id = Uuid::new_v4();

        sqlx::query(
            "INSERT INTO projects (id, owner_id, name, description, thumbnail, scene, script, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE
             SET name        = EXCLUDED.name,
                 description = EXCLUDED.description,
                 thumbnail   = EXCLUDED.thumbnail,
                 scene       = EXCLUDED.scene,
                 script      = EXCLUDED.script,
                 updated_at  = EXCLUDED.updated_at
             WHERE projects.owner_id = EXCLUDED.owner_id",
        )
        .bind(project_id)
        .bind(auth.user_id)
        .bind(project.name.trim())
        .bind(project.description.as_deref())
        .bind(project.thumbnail.as_deref())
        .bind(project.scene)
        .bind(project.script.as_deref())
        .bind(now)
        .bind(now)
        .execute(&state.db)
        .await?;

        synced += 1;
    }

    Ok(Json(SyncProjectsResponse { synced }))
}
