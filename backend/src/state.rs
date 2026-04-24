use crate::{config::Config, db::Db};
use axum::extract::FromRef;
use aws_sdk_s3::Client as S3Client;

/// Shared application state threaded through all Axum handlers.
#[derive(Clone)]
pub struct AppState {
    pub db: Db,
    pub config: Config,
    /// Cloudflare R2 client (S3-compatible).
    pub s3: S3Client,
}

impl FromRef<AppState> for Config {
    fn from_ref(state: &AppState) -> Self {
        state.config.clone()
    }
}
