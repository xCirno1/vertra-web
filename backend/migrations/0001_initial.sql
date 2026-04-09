-- Migration 0001: Initial schema for Vertra
-- Creates the `users` and `projects` tables.

-- Enable the pgcrypto extension for gen_random_uuid() (available on Supabase).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT         NOT NULL UNIQUE,
    name          TEXT,
    avatar        TEXT,
    password_hash TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── projects ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT         NOT NULL,
    description TEXT,
    thumbnail   TEXT,
    -- Full serialised scene stored as JSONB for flexibility and indexability.
    scene       JSONB,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index to speed up per-user project lookups.
CREATE INDEX IF NOT EXISTS idx_projects_owner_updated
    ON projects (owner_id, updated_at DESC);
