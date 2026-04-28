-- Migration 0005: Add project publication support
ALTER TABLE projects ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN published_token TEXT;

CREATE UNIQUE INDEX idx_projects_published_token
    ON projects (published_token)
    WHERE published_token IS NOT NULL;
