CREATE TABLE IF NOT EXISTS user_kyc_documents (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    temp_registration_id UUID,
    document_type VARCHAR(40) NOT NULL,
    object_key VARCHAR(700) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    original_file_name VARCHAR(255),
    file_size BIGINT,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kyc_doc_user ON user_kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_doc_temp ON user_kyc_documents(temp_registration_id);
CREATE INDEX IF NOT EXISTS idx_kyc_doc_type ON user_kyc_documents(document_type);

CREATE TABLE IF NOT EXISTS project_units (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    config_id BIGINT NOT NULL,
    unit_label VARCHAR(120) NOT NULL,
    unit_no VARCHAR(80),
    floor_no VARCHAR(80),
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    sold_at TIMESTAMP,
    sale_id BIGINT,
    CONSTRAINT uk_project_unit_label UNIQUE(config_id, unit_label)
);

CREATE INDEX IF NOT EXISTS idx_project_unit_project ON project_units(project_id);
CREATE INDEX IF NOT EXISTS idx_project_unit_config ON project_units(config_id);
CREATE INDEX IF NOT EXISTS idx_project_unit_status ON project_units(status);

ALTER TABLE sales ADD COLUMN IF NOT EXISTS unit_id BIGINT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS unit_label VARCHAR(120);
