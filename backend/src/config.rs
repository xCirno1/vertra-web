/// Runtime configuration loaded from environment variables.
#[derive(Clone, Debug)]
pub struct Config {
    /// PostgreSQL connection URL (DATABASE_URL or SUPABASE_URL).
    pub database_url: String,
    /// HMAC secret used to sign / verify JWT tokens.
    pub jwt_secret: String,
    /// TCP port the HTTP server binds to (default: 8080).
    pub port: u16,
    /// Allowed CORS origin for the frontend (e.g. http://localhost:3000).
    pub frontend_origin: String,
}

impl Config {
    /// Build a [`Config`] from the process environment.
    ///
    /// * `DATABASE_URL` is preferred; falls back to `SUPABASE_URL`.
    /// * `JWT_SECRET` defaults to a dev-only placeholder if absent.
    /// * `PORT` defaults to `8080`.
    pub fn from_env() -> Result<Self, std::env::VarError> {
        let database_url = std::env::var("DATABASE_URL")
            .or_else(|_| std::env::var("SUPABASE_URL"))?;

        let jwt_secret = std::env::var("JWT_SECRET")
            .unwrap_or_else(|_| "vertra-dev-secret-please-change-in-production".to_string());

        let port = std::env::var("PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(8080_u16);

        let frontend_origin = std::env::var("FRONTEND_ORIGIN")
            .unwrap_or_else(|_| "http://localhost:3000".to_string());

        Ok(Config { database_url, jwt_secret, port, frontend_origin })
    }
}
