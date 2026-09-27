-- V13: Add subscription_rate to custom_cities and areas tables
-- -----------------------------------------------------------

-- 1. Add subscription_rate column to custom_cities
ALTER TABLE custom_cities
    ADD COLUMN IF NOT EXISTS subscription_rate DOUBLE PRECISION;

-- 2. Add subscription_rate column to areas
ALTER TABLE areas
    ADD COLUMN IF NOT EXISTS subscription_rate DOUBLE PRECISION;

-- 3. Backfill custom_cities.subscription_rate from locations (city-level, area is null)
UPDATE custom_cities c
   SET subscription_rate = l.subscription_rate
  FROM (
      SELECT DISTINCT ON (LOWER(city), LOWER(state)) city, state, subscription_rate
        FROM locations
       WHERE (area IS NULL OR TRIM(area) = '')
         AND subscription_rate IS NOT NULL
       ORDER BY LOWER(city), LOWER(state), id DESC
  ) l
 WHERE LOWER(c.city) = LOWER(l.city)
   AND LOWER(c.state) = LOWER(l.state)
   AND c.subscription_rate IS NULL;

-- 4. Backfill areas.subscription_rate from locations (area-level)
UPDATE areas a
   SET subscription_rate = l.subscription_rate
  FROM (
      SELECT DISTINCT ON (LOWER(area), LOWER(city)) area, city, subscription_rate
        FROM locations
       WHERE area IS NOT NULL
         AND TRIM(area) != ''
         AND subscription_rate IS NOT NULL
       ORDER BY LOWER(area), LOWER(city), id DESC
  ) l
 WHERE LOWER(a.name) = LOWER(l.area)
   AND LOWER(a.city) = LOWER(l.city)
   AND a.subscription_rate IS NULL;
