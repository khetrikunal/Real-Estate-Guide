-- V17: Add soft delete fields to projects table
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_projects_is_deleted ON projects(is_deleted);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);
