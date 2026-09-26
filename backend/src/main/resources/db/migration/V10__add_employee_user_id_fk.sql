-- V10: Add user_id FK to employees table and backfill from email match
-- -----------------------------------------------------------------------
-- The employees table previously linked to users only by matching email
-- strings. This migration adds a proper FK column and backfills it.
-- Rows whose email cannot be matched to a user are left NULL
-- (logged separately at the application layer during EmployeeService changes).
-- -----------------------------------------------------------------------

-- 1. Add the column (nullable initially to allow safe backfill)
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- 2. Backfill: resolve each employee's email to the matching user's id
UPDATE employees e
   SET user_id = u.id
  FROM users u
 WHERE LOWER(u.email) = LOWER(e.email)
   AND e.user_id IS NULL;

-- 3. Add FK constraint (not enforced as NOT NULL yet — let the app-layer
--    migration period establish the invariant before we make it mandatory)
ALTER TABLE employees
    ADD CONSTRAINT fk_employees_user_id
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL;

-- 4. Index for FK lookups
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
