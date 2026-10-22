-- V18: Property Type Taxonomy, Land Specifics & Multi-Tower Support
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS plot_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS survey_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS plot_dimensions VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ownership_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS has_multiple_towers BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tower_count INTEGER DEFAULT 1;

ALTER TABLE buildings
    ADD COLUMN IF NOT EXISTS tower_code VARCHAR(50);

ALTER TABLE project_documents
    ADD COLUMN IF NOT EXISTS building_id BIGINT,
    ADD COLUMN IF NOT EXISTS document_level VARCHAR(50),
    ADD COLUMN IF NOT EXISTS document_category VARCHAR(100);

DO $$
BEGIN
    ALTER TABLE projects ALTER COLUMN project_name DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
