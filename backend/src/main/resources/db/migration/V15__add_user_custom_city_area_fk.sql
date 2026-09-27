-- V15: Add custom_city_id and area_id FK columns to users table.
-- These replace the deprecated assigned_city / assigned_state / assigned_area string columns
-- for scope enforcement. The deprecated columns are kept for one release for backward compat.

ALTER TABLE users
    ADD COLUMN custom_city_id BIGINT NULL,
    ADD COLUMN area_id        BIGINT NULL;

-- Backfill: resolve city name -> custom_city_id by matching assigned_city (case-insensitive)
UPDATE users u
    JOIN custom_cities cc ON LOWER(cc.city) = LOWER(u.assigned_city)
SET u.custom_city_id = cc.id
WHERE u.assigned_city IS NOT NULL
  AND u.custom_city_id IS NULL;

-- Backfill: resolve area name -> area_id by matching assigned_area + assigned_city (case-insensitive)
UPDATE users u
    JOIN areas a ON LOWER(a.name) = LOWER(u.assigned_area)
        AND LOWER(a.city) = LOWER(u.assigned_city)
SET u.area_id = a.id
WHERE u.assigned_area IS NOT NULL
  AND u.area_id IS NULL;

-- Add foreign-key constraints (deferred so missing rows don't block migration)
ALTER TABLE users
    ADD CONSTRAINT fk_users_custom_city FOREIGN KEY (custom_city_id) REFERENCES custom_cities (id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_users_area        FOREIGN KEY (area_id)         REFERENCES areas (id)         ON DELETE SET NULL;
