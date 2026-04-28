-- Migration 0004: Add visibility flag to textures
-- is_public = true  → visible and usable by any authenticated user (community library)
-- is_public = false → private: only the owner can see it
--                     project_id IS NULL  → private but available across all owner's projects
--                     project_id IS NOT NULL → private, scoped to a single project

ALTER TABLE textures
    ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_textures_public
    ON textures (is_public)
    WHERE is_public = true;
