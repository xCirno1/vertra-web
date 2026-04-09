use crate::{config::Config, db::Db};
use axum::extract::FromRef;

/// Shared application state threaded through all Axum handlers.
#[derive(Clone)]
pub struct AppState {
    pub db: Db,
    pub config: Config,
}

impl FromRef<AppState> for Config {
    fn from_ref(state: &AppState) -> Self {
        state.config.clone()
    }
}
