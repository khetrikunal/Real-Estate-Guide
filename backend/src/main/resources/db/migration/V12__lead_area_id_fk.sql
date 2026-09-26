-- V12: Add area_id FK to leads table (alongside existing city string column)
-- -----------------------------------------------------------------------
-- The city column stays in place for one release to give the frontend time
-- to migrate to sending areaId. Both columns are valid during this period.
-- -----------------------------------------------------------------------

-- 1. Add the nullable FK column
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS area_id BIGINT;

-- 2. Backfill: match city string (case-insensitive) to areas.name.
--    When multiple areas share a name (different states/cities), pick the most
--    recently created one; flag ambiguous matches in migration_warnings.
UPDATE leads l
   SET area_id = a.id
  FROM (
      SELECT DISTINCT ON (LOWER(name)) id, name
        FROM areas
       ORDER BY LOWER(name), created_at DESC
  ) a
 WHERE LOWER(l.city) = LOWER(a.name)
   AND l.area_id IS NULL;

-- 3. Log city values that could not be matched to any area
CREATE TABLE IF NOT EXISTS migration_warnings (
    id          BIGSERIAL PRIMARY KEY,
    migration   VARCHAR(100) NOT NULL,
    entity      VARCHAR(100) NOT NULL,
    entity_id   BIGINT,
    message     TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO migration_warnings (migration, entity, entity_id, message)
SELECT 'V12', 'Lead', l.id,
       'city=' || COALESCE(l.city, 'NULL') ||
       ' could not be matched to any row in areas.name'
  FROM leads l
 WHERE l.area_id IS NULL
   AND l.city IS NOT NULL
   AND l.city != '';

-- 4. FK constraint (nullable, no ON DELETE CASCADE — area deletion should be
--    gated at the application layer, not cascade-deleted here)
ALTER TABLE leads
    ADD CONSTRAINT fk_leads_area_id
    FOREIGN KEY (area_id) REFERENCES areas(id)
    ON DELETE SET NULL;

-- 5. Index
CREATE INDEX IF NOT EXISTS idx_leads_area_id ON leads(area_id);

-- NOTE: `city` column is intentionally kept. Drop it in a future migration
--       once the frontend has migrated to using area_id.
