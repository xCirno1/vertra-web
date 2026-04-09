-- Migration 0002: Add per-project engine script storage
ALTER TABLE projects ADD COLUMN IF NOT EXISTS script TEXT;
