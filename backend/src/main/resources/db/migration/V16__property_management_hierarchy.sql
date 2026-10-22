-- V16: Property Management & Configuration System Hierarchy
-- Adds buildings, floors, property_units, unit_documents and projects columns

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS builder_email VARCHAR(150),
    ADD COLUMN IF NOT EXISTS property_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS apartment_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS total_land_area DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS total_land_area_unit VARCHAR(20) DEFAULT 'sq_ft',
    ADD COLUMN IF NOT EXISTS total_built_up_area DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS property_code VARCHAR(50);

CREATE TABLE IF NOT EXISTS buildings (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    name VARCHAR(120) NOT NULL,
    building_type VARCHAR(50) DEFAULT 'MIXED_USE',
    total_floors INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_building_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_buildings_project ON buildings(project_id);

CREATE TABLE IF NOT EXISTS floors (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    building_id BIGINT NOT NULL,
    floor_number INTEGER NOT NULL,
    floor_name VARCHAR(100) NOT NULL,
    floor_type VARCHAR(50) NOT NULL DEFAULT 'MIXED',
    total_units INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_floor_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_floor_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
    CONSTRAINT uk_building_floor UNIQUE (building_id, floor_number)
);

CREATE INDEX IF NOT EXISTS idx_floors_building ON floors(building_id);
CREATE INDEX IF NOT EXISTS idx_floors_project ON floors(project_id);

CREATE TABLE IF NOT EXISTS property_units (
    id BIGSERIAL PRIMARY KEY,
    property_project_id BIGINT NOT NULL,
    building_id BIGINT NOT NULL,
    floor_id BIGINT NOT NULL,
    unit_number VARCHAR(80) NOT NULL,
    unit_type VARCHAR(50) NOT NULL,
    sub_type VARCHAR(50),
    carpet_area DOUBLE PRECISION,
    carpet_area_unit VARCHAR(20) DEFAULT 'sq_ft',
    built_up_area DOUBLE PRECISION,
    built_up_area_unit VARCHAR(20) DEFAULT 'sq_ft',
    super_built_up_area DOUBLE PRECISION,
    bedrooms INTEGER,
    bathrooms INTEGER,
    balconies INTEGER,
    parking_spaces INTEGER,
    facing VARCHAR(50),
    price DOUBLE PRECISION,
    rent_price DOUBLE PRECISION,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    owner_name VARCHAR(150),
    owner_phone VARCHAR(50),
    owner_email VARCHAR(150),
    description TEXT,
    cover_image_url VARCHAR(700),
    floor_plan_url VARCHAR(700),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_unit_project FOREIGN KEY (property_project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_unit_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
    CONSTRAINT fk_unit_floor FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE,
    CONSTRAINT uk_floor_unit_number UNIQUE (floor_id, unit_number)
);

CREATE INDEX IF NOT EXISTS idx_units_project ON property_units(property_project_id);
CREATE INDEX IF NOT EXISTS idx_units_building ON property_units(building_id);
CREATE INDEX IF NOT EXISTS idx_units_floor ON property_units(floor_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON property_units(status);
CREATE INDEX IF NOT EXISTS idx_units_type ON property_units(unit_type);

CREATE TABLE IF NOT EXISTS unit_documents (
    id BIGSERIAL PRIMARY KEY,
    property_project_id BIGINT NOT NULL,
    building_id BIGINT NOT NULL,
    floor_id BIGINT NOT NULL,
    unit_id BIGINT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(80) NOT NULL,
    object_key VARCHAR(700) NOT NULL,
    file_path VARCHAR(700) NOT NULL,
    file_size BIGINT,
    content_type VARCHAR(120),
    uploaded_by BIGINT,
    description TEXT,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_doc_project FOREIGN KEY (property_project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_doc_unit FOREIGN KEY (unit_id) REFERENCES property_units(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_unit_docs_unit ON unit_documents(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_docs_project ON unit_documents(property_project_id);
