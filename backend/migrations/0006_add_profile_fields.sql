-- Migration 0006: Extended user profile fields
-- Adds rich profile customization columns to the users table.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS bio             TEXT,
    ADD COLUMN IF NOT EXISTS website         TEXT,
    ADD COLUMN IF NOT EXISTS location        TEXT,
    ADD COLUMN IF NOT EXISTS banner_color    TEXT     NOT NULL DEFAULT '#1dd4f6',
    ADD COLUMN IF NOT EXISTS avatar_r2_key   TEXT,
    ADD COLUMN IF NOT EXISTS profile_settings JSONB   NOT NULL DEFAULT '{}';
