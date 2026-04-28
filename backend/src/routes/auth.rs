use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use chrono::Utc;
use jsonwebtoken::{encode, EncodingKey, Header};
use uuid::Uuid;

use crate::{
    errors::{ApiResult, AppError},
    middleware::auth::{AuthUser, Claims},
    models::{
        AuthResponse, LoginRequest, ProfileResponse, RegisterRequest, UserDto,
    },
    state::AppState,
};

/// Columns returned by the login SELECT query.
type LoginRow = (Uuid, String, Option<String>, Option<String>, String);

/// `POST /auth/register`
///
/// Creates a new user.  The password is hashed with bcrypt before storage.
pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> ApiResult<(StatusCode, Json<AuthResponse>)> {
    if body.email.is_empty() || body.password.is_empty() {
        return Err(AppError::BadRequest("email and password are required".into()));
    }

    // Check whether the email is already taken.
    let existing: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM users WHERE email = $1",
    )
    .bind(&body.email)
    .fetch_optional(&state.db)
    .await?;

    if existing.is_some() {
        return Err(AppError::BadRequest("Email is already registered".into()));
    }

    // Hash the password using bcrypt (work factor 12).
    let password_hash = bcrypt_hash(&body.password)?;

    let now = Utc::now();
    let user_id = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(user_id)
    .bind(&body.email)
    .bind(&body.name)
    .bind(&password_hash)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await?;

    let user_dto = UserDto {
        id: user_id,
        email: body.email.clone(),
        name: body.name.clone(),
        avatar: None,
    };

    let token = mint_token(user_id, &body.email, &state.config.jwt_secret)?;

    Ok((
        StatusCode::CREATED,
        Json(AuthResponse { token, user: user_dto }),
    ))
}

/// `POST /auth/login`
///
/// Validates credentials and returns a JWT.
pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> ApiResult<Json<AuthResponse>> {
    if body.email.is_empty() || body.password.is_empty() {
        return Err(AppError::BadRequest("email and password are required".into()));
    }

    let row: Option<LoginRow> = sqlx::query_as(
        "SELECT id, email, name, avatar, password_hash FROM users WHERE email = $1",
    )
    .bind(&body.email)
    .fetch_optional(&state.db)
    .await?;

    let (id, email, name, avatar, hash) = row.ok_or(AppError::Unauthorized)?;

    let valid = bcrypt_verify(&body.password, &hash)?;
    if !valid {
        return Err(AppError::Unauthorized);
    }

    let token = mint_token(id, &email, &state.config.jwt_secret)?;
    let user_dto = UserDto { id, email, name, avatar };

    Ok(Json(AuthResponse { token, user: user_dto }))
}

/// `GET /auth/me`
///
/// Returns the profile of the currently authenticated user.
pub async fn me(
    auth: AuthUser,
    State(state): State<AppState>,
) -> ApiResult<Json<ProfileResponse>> {
    let row: Option<(Uuid, String, Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT id, email, name, avatar FROM users WHERE id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await?;

    let (id, email, name, avatar) = row.ok_or(AppError::NotFound)?;

    Ok(Json(ProfileResponse {
        user: UserDto { id, email, name, avatar },
    }))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Mint a JWT that expires in 30 days.
fn mint_token(user_id: Uuid, email: &str, secret: &str) -> ApiResult<String> {
    let exp = (Utc::now() + chrono::Duration::days(30)).timestamp() as usize;
    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        exp,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(AppError::Jwt)
}

/// Hash a plaintext password with bcrypt (cost 12).
///
/// Uses a simple manual bcrypt implementation via the `bcrypt` crate features
/// available through `jsonwebtoken`'s dependencies — but since we only depend
/// on `jsonwebtoken`, we implement a lightweight bcrypt wrapper here using the
/// `bcrypt` crate which we add as a dependency in Cargo.toml.
fn bcrypt_hash(password: &str) -> ApiResult<String> {
    bcrypt::hash(password, 12)
        .map_err(|_| AppError::Internal)
}

fn bcrypt_verify(password: &str, hash: &str) -> ApiResult<bool> {
    bcrypt::verify(password, hash)
        .map_err(|_| AppError::Internal)
}
