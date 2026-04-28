use axum::{routing::get, Json, Router};
use serde_json::{json, Value};

use crate::state::AppState;

pub mod auth;
pub mod projects;
pub mod textures;
pub mod vtr;

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
        .route(
            "/projects/:id/publish",
            axum::routing::post(projects::publish_project)
                .delete(projects::unpublish_project),
        )
        // Public (no-auth) project endpoint — by share token
        .route("/projects/s/:token", get(projects::get_public_project))
        // VTR snapshot endpoints (Cloudflare R2)
        .route(
            "/api/vtr/:project_id",
            axum::routing::put(vtr::upload_vtr).get(vtr::download_vtr),
        )
        // Public (no-auth) VTR download — by share token
        .route("/api/vtr/s/:token", get(vtr::download_public_vtr))
        // Texture endpoints
        .route(
            "/textures/upload",
            axum::routing::post(textures::upload_texture)
                .layer(axum::extract::DefaultBodyLimit::max(6 * 1024 * 1024)),
        )
        .route("/textures", get(textures::list_textures))
        .route("/textures/:id/url", get(textures::get_texture_url))
        .route(
            "/textures/:id",
            axum::routing::patch(textures::update_texture).delete(textures::delete_texture),
        )
        .with_state(state)
}

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}
