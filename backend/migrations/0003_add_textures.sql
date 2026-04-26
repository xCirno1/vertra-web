-- Migration 0003: Texture metadata storage
-- Stores metadata for user-uploaded textures.
-- Actual image bytes live in Cloudflare R2; only metadata is stored here.

CREATE TABLE IF NOT EXISTS textures (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- NULL  = global (per-account); non-NULL = project-local
    project_id  UUID         REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT         NOT NULL,
    file_name   TEXT         NOT NULL,
    mime_type   TEXT         NOT NULL DEFAULT 'image/png',
    size_bytes  BIGINT       NOT NULL,
    width       INTEGER,
    height      INTEGER,
    r2_key      TEXT         NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_textures_owner
    ON textures (owner_id);

CREATE INDEX IF NOT EXISTS idx_textures_project
    ON textures (project_id)
    WHERE project_id IS NOT NULL;
