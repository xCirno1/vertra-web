use std::net::SocketAddr;

use axum::Router;
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod db;
mod errors;
mod middleware;
mod models;
mod routes;
mod state;

use config::Config;
use state::AppState;

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::new(
                std::env::var("RUST_LOG")
                    .unwrap_or_else(|_| "vertra_backend=debug,tower_http=debug".into()),
            ),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load .env in the backend directory; ignore error if missing (env vars may
    // already be injected by the shell / Docker / etc.)
    dotenvy::dotenv().ok();

    let config = Config::from_env().expect("Failed to load configuration from environment");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to the database");

    // Apply SQL migrations from the ./migrations directory.
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    let state = AppState { db: pool, config: config.clone() };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app: Router = routes::create_router(state).layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("Vertra backend listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind to address");

    axum::serve(listener, app).await.expect("Server error");
}
