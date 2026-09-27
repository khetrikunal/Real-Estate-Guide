-- V14: Add active boolean column to custom_cities and areas
-- --------------------------------------------------------

ALTER TABLE custom_cities
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE areas
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
