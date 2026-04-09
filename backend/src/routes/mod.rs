use axum::{routing::get, Json, Router};
use serde_json::{json, Value};

use crate::state::AppState;

pub mod auth;
pub mod projects;

/// Build the main application router with all named sub-routers attached.
pub fn create_router(state: AppState) -> Router {
    Router::new()
        // Health-check — no auth required
        .route("/health", get(health))
        // Auth endpoints
        .route("/auth/register", axum::routing::post(auth::register))
        .route("/auth/login", axum::routing::post(auth::login))
        .route("/auth/me", get(auth::me))
        // Project endpoints
        .route("/projects", get(projects::list_projects).post(projects::create_project))
        .route("/projects/sync", axum::routing::post(projects::sync_projects))
        .route(
            "/projects/:id",
            get(projects::get_project)
                .patch(projects::update_project)
                .delete(projects::delete_project),
        )
        .with_state(state)
}

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}
