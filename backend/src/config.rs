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
    #[allow(dead_code)]
    pub frontend_origin: String,
    /// Cloudflare R2 account ID (used to build the S3-compatible endpoint URL).
    pub r2_account_id: String,
    /// Name of the R2 bucket used for .vtr file storage.
    pub r2_bucket_name: String,
    /// R2 S3-compatible API access key ID.
    pub aws_access_key_id: String,
    /// R2 S3-compatible API secret access key.
    pub aws_secret_access_key: String,
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

        let r2_account_id = std::env::var("R2_ACCOUNT_ID").unwrap_or_default();
        let r2_bucket_name = std::env::var("R2_BUCKET_NAME").unwrap_or_default();
        let aws_access_key_id = std::env::var("AWS_ACCESS_KEY_ID").unwrap_or_default();
        let aws_secret_access_key = std::env::var("AWS_SECRET_ACCESS_KEY").unwrap_or_default();

        Ok(Config {
            database_url,
            jwt_secret,
            port,
            frontend_origin,
            r2_account_id,
            r2_bucket_name,
            aws_access_key_id,
            aws_secret_access_key,
        })
    }
}
