-- Normalize nullable soft-delete values without changing existing TRUE/FALSE values.
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN;

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

UPDATE projects
SET is_deleted = FALSE
WHERE is_deleted IS NULL;

ALTER TABLE projects
    ALTER COLUMN is_deleted SET DEFAULT FALSE,
    ALTER COLUMN is_deleted SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_is_deleted ON projects(is_deleted);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);
