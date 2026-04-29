use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

// ─── DB row structs ──────────────────────────────────────────────────────────

/// Row returned from the `users` table.
#[derive(Debug, sqlx::FromRow)]
pub struct UserRow {
    pub id: Uuid,
    pub email: String,
    pub name: Option<String>,
    pub avatar: Option<String>,
    #[allow(dead_code)]
    pub password_hash: String,
    #[allow(dead_code)]
    pub created_at: DateTime<Utc>,
    #[allow(dead_code)]
    pub updated_at: DateTime<Utc>,
}

/// Full profile row (extended columns added in migration 0006).
#[derive(Debug, sqlx::FromRow)]
pub struct ProfileRow {
    pub id: Uuid,
    pub email: String,
    pub name: Option<String>,
    pub avatar: Option<String>,
    pub bio: Option<String>,
    pub website: Option<String>,
    pub location: Option<String>,
    pub banner_color: String,
    #[allow(dead_code)]
    pub avatar_r2_key: Option<String>,
    pub profile_settings: Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Row returned from the `projects` table.
#[derive(Debug, sqlx::FromRow)]
pub struct ProjectRow {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub thumbnail: Option<String>,
    pub scene: Option<Value>,
    pub script: Option<String>,
    pub is_published: bool,
    pub published_token: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Row returned when fetching a project by publish token (no auth).
#[derive(Debug, sqlx::FromRow)]
pub struct PublicProjectRow {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub scene: Option<Value>,
    pub script: Option<String>,
}

// ─── API request / response DTOs ────────────────────────────────────────────

/// POST /auth/register
#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: Option<String>,
}

/// POST /auth/login
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

/// Response body for both register and login.
#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserDto,
}

/// Public-facing user object.
#[derive(Debug, Serialize, Clone)]
pub struct UserDto {
    pub id: Uuid,
    pub email: String,
    pub name: Option<String>,
    pub avatar: Option<String>,
}

impl From<&UserRow> for UserDto {
    fn from(row: &UserRow) -> Self {
        Self {
            id: row.id,
            email: row.email.clone(),
            name: row.name.clone(),
            avatar: row.avatar.clone(),
        }
    }
}

/// GET /auth/me response (slim)
#[derive(Debug, Serialize)]
pub struct ProfileResponse {
    pub user: UserDto,
}

/// Full profile DTO including extended fields.
#[derive(Debug, Serialize, Clone)]
pub struct FullProfileDto {
    pub id: Uuid,
    pub email: String,
    pub name: Option<String>,
    pub avatar: Option<String>,
    pub bio: Option<String>,
    pub website: Option<String>,
    pub location: Option<String>,
    pub banner_color: String,
    pub profile_settings: Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<ProfileRow> for FullProfileDto {
    fn from(row: ProfileRow) -> Self {
        Self {
            id: row.id,
            email: row.email,
            name: row.name,
            avatar: row.avatar,
            bio: row.bio,
            website: row.website,
            location: row.location,
            banner_color: row.banner_color,
            profile_settings: row.profile_settings,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

/// GET /profile response
#[derive(Debug, Serialize)]
pub struct FullProfileResponse {
    pub user: FullProfileDto,
}

/// PATCH /profile request body — all fields optional
#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub name: Option<String>,
    pub bio: Option<String>,
    pub website: Option<String>,
    pub location: Option<String>,
    pub banner_color: Option<String>,
    /// Arbitrary JSON blob of client-side saved settings.
    pub profile_settings: Option<Value>,
}

/// POST /projects request body
#[derive(Debug, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub description: Option<String>,
    pub scene: Option<Value>,
    pub script: Option<String>,
    pub thumbnail: Option<String>,
}

/// PATCH /projects/:id request body — all fields optional
#[derive(Debug, Deserialize)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub scene: Option<Value>,
    pub script: Option<String>,
    pub thumbnail: Option<String>,
}

/// Public-facing project object returned by the API.
#[derive(Debug, Serialize)]
pub struct ProjectDto {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub thumbnail: Option<String>,
    pub scene: Option<Value>,
    pub script: Option<String>,
    pub is_published: bool,
    pub published_token: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<ProjectRow> for ProjectDto {
    fn from(row: ProjectRow) -> Self {
        Self {
            id: row.id,
            owner_id: row.owner_id,
            name: row.name,
            description: row.description,
            thumbnail: row.thumbnail,
            scene: row.scene,
            script: row.script,
            is_published: row.is_published,
            published_token: row.published_token,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

/// Stripped project data returned for anonymous public-viewer requests.
#[derive(Debug, Serialize)]
pub struct PublicProjectDto {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub scene: Option<Value>,
    pub script: Option<String>,
}

impl From<PublicProjectRow> for PublicProjectDto {
    fn from(row: PublicProjectRow) -> Self {
        Self {
            id: row.id,
            name: row.name,
            description: row.description,
            scene: row.scene,
            script: row.script,
        }
    }
}

/// Batch-sync request: upsert multiple projects at once.
#[derive(Debug, Deserialize)]
pub struct SyncProjectsRequest {
    pub projects: Vec<CreateProjectRequest>,
}

#[derive(Debug, Serialize)]
pub struct SyncProjectsResponse {
    pub synced: usize,
}

/// Generic OK response.
#[derive(Debug, Serialize)]
pub struct OkResponse {
    pub ok: bool,
}

// ─── Texture models ──────────────────────────────────────────────────────────

/// Row returned from the `textures` table.
#[derive(Debug, sqlx::FromRow)]
pub struct TextureRow {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub project_id: Option<Uuid>,
    pub name: String,
    pub file_name: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub r2_key: String,
    pub created_at: DateTime<Utc>,
    /// Whether the texture is visible to all authenticated users.
    pub is_public: bool,
}

/// Public-facing texture metadata returned by the API.
#[derive(Debug, Serialize)]
pub struct TextureDto {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub project_id: Option<Uuid>,
    pub name: String,
    pub file_name: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub is_public: bool,
}

impl From<TextureRow> for TextureDto {
    fn from(row: TextureRow) -> Self {
        Self {
            id: row.id,
            owner_id: row.owner_id,
            project_id: row.project_id,
            name: row.name,
            file_name: row.file_name,
            mime_type: row.mime_type,
            size_bytes: row.size_bytes,
            width: row.width,
            height: row.height,
            created_at: row.created_at,
            is_public: row.is_public,
        }
    }
}

/// Response body for a presigned R2 download URL.
#[derive(Debug, Serialize)]
pub struct PresignedUrlResponse {
    pub url: String,
}

/// PATCH /textures/:id request body — all fields optional.
#[derive(Debug, Deserialize)]
pub struct UpdateTextureRequest {
    pub name: Option<String>,
    pub is_public: Option<bool>,
}
