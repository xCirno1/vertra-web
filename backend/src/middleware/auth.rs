use crate::{config::Config, errors::AppError};
use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts},
    http::request::Parts,
};
use chrono::Utc;
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// All data encoded inside a JWT.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// Subject — the user's UUID as a string.
    pub sub: String,
    /// User's email address.
    pub email: String,
    /// Expiry timestamp (Unix seconds).
    pub exp: usize,
}

/// Authenticated user extracted from the `Authorization: Bearer <token>` header.
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    #[allow(dead_code)]
    pub email: String,
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    Config: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let config = Config::from_ref(state);

        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or(AppError::Unauthorized)?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or(AppError::Unauthorized)?;

        let mut validation = Validation::default();
        validation.validate_exp = true;

        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
            &validation,
        )
        .map_err(AppError::Jwt)?;

        let claims = token_data.claims;

        // Reject tokens that have already expired (belt-and-suspenders check).
        let now = Utc::now().timestamp() as usize;
        if claims.exp < now {
            return Err(AppError::Unauthorized);
        }

        let user_id =
            Uuid::parse_str(&claims.sub).map_err(|_| AppError::Unauthorized)?;

        Ok(AuthUser { user_id, email: claims.email })
    }
}
