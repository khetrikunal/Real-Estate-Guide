-- V2: Add follow_ups table and relax leads constraints

-- 1. Relax leads: make email, phone, property_interest nullable
ALTER TABLE leads ALTER COLUMN email DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN property_interest DROP NOT NULL;

-- 2. Drop existing unique constraint on email if present, add partial unique
DO $$
BEGIN
    -- Drop any existing unique constraint on email
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'leads'::regclass AND conname LIKE '%email%'
    ) THEN
        EXECUTE 'ALTER TABLE leads DROP CONSTRAINT ' ||
            (SELECT conname FROM pg_constraint
             WHERE conrelid = 'leads'::regclass AND conname LIKE '%email%' LIMIT 1);
    END IF;
END $$;

-- Partial unique index: only enforce uniqueness for non-null email values
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_unique
    ON leads (email) WHERE email IS NOT NULL;

-- 3. Create follow_ups table
CREATE TABLE follow_ups (
    id              BIGSERIAL PRIMARY KEY,
    lead_id         BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    owner_user_id   BIGINT NOT NULL REFERENCES users(id),
    customer_name   VARCHAR(255) NOT NULL,
    calling_type    VARCHAR(50) NOT NULL,
    description     TEXT,
    scheduled_at    TIMESTAMP NOT NULL,
    completed_at    TIMESTAMP,
    is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
    completion_note TEXT,
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Indexes for common query patterns
CREATE INDEX idx_follow_ups_lead_id ON follow_ups(lead_id);
CREATE INDEX idx_follow_ups_owner_user_id ON follow_ups(owner_user_id);
CREATE INDEX idx_follow_ups_scheduled_at ON follow_ups(scheduled_at);
CREATE INDEX idx_follow_ups_deleted_at ON follow_ups(deleted_at);
CREATE INDEX idx_follow_ups_active_dashboard
    ON follow_ups(owner_user_id, scheduled_at)
    WHERE deleted_at IS NULL AND is_completed = FALSE;
