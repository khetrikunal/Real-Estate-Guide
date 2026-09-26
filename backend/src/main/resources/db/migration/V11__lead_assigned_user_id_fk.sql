-- V11: Replace Lead.assignedEmployeeId (varchar) with assignedUserId (bigint FK)
-- -----------------------------------------------------------------------
-- The leads table stored the assignee's user.id as a plain VARCHAR string.
-- This migration:
--   1. Adds the new typed FK column
--   2. Backfills it by casting the existing string to BIGINT where resolvable
--   3. Logs (into a temp table) any rows whose value cannot be cast
--   4. Keeps the old column so the app can be deployed before the column is dropped
-- -----------------------------------------------------------------------

-- 1. Add the new FK column (nullable — existing rows are unknown until backfill)
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS assigned_user_id BIGINT;

-- 2. Backfill: cast existing string values that look like valid integer IDs
--    and cross-reference them against the users table.
UPDATE leads l
   SET assigned_user_id = CAST(l.assigned_employee_id AS BIGINT)
 WHERE l.assigned_employee_id IS NOT NULL
   AND l.assigned_employee_id ~ '^[0-9]+$'
   AND EXISTS (
       SELECT 1 FROM users u WHERE u.id = CAST(l.assigned_employee_id AS BIGINT)
   );

-- 3. Log unresolvable rows so they are not silently lost
-- (written to a migration_warnings table, created here if it doesn't exist)
CREATE TABLE IF NOT EXISTS migration_warnings (
    id          BIGSERIAL PRIMARY KEY,
    migration   VARCHAR(100) NOT NULL,
    entity      VARCHAR(100) NOT NULL,
    entity_id   BIGINT,
    message     TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO migration_warnings (migration, entity, entity_id, message)
SELECT 'V11', 'Lead', l.id,
       'assigned_employee_id=' || COALESCE(l.assigned_employee_id, 'NULL') ||
       ' could not be resolved to a valid users.id'
  FROM leads l
 WHERE l.assigned_user_id IS NULL
   AND l.assigned_employee_id IS NOT NULL
   AND l.assigned_employee_id != '';

-- 4. Add FK constraint (only on non-null values — nulls are allowed)
ALTER TABLE leads
    ADD CONSTRAINT fk_leads_assigned_user_id
    FOREIGN KEY (assigned_user_id) REFERENCES users(id)
    ON DELETE SET NULL;

-- 5. Index for FK lookups
CREATE INDEX IF NOT EXISTS idx_leads_assigned_user_id ON leads(assigned_user_id);

-- NOTE: The old `assigned_employee_id` column is intentionally kept for now.
--       Drop it in a future migration once the application is fully deployed.
