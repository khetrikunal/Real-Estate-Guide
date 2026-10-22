-- V2: Reconcile follow_ups table and relax leads constraints.
-- Safe for the existing empty follow_ups table (created earlier by Hibernate).

-- 1. Allow nullable lead fields.
ALTER TABLE public.leads
    ALTER COLUMN email DROP NOT NULL,
    ALTER COLUMN phone DROP NOT NULL,
    ALTER COLUMN property_interest DROP NOT NULL;

-- 2. Enforce uniqueness for non-null email values.
-- Existing unique constraints, if any, are left intact.
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_unique
    ON public.leads (email)
    WHERE email IS NOT NULL;

-- 3. Create the table only if it does not already exist.
CREATE TABLE IF NOT EXISTS public.follow_ups (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    created_by_user_id BIGINT NOT NULL REFERENCES public.users(id),
    owner_user_id BIGINT NOT NULL REFERENCES public.users(id),
    customer_name VARCHAR(255) NOT NULL,
    calling_type VARCHAR(50) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completion_note TEXT,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Reconcile existing columns with the intended schema.
ALTER TABLE public.follow_ups
    ALTER COLUMN calling_type TYPE VARCHAR(50),
    ALTER COLUMN customer_name TYPE VARCHAR(255),
    ALTER COLUMN description TYPE TEXT USING description::TEXT,
    ALTER COLUMN completion_note TYPE TEXT USING completion_note::TEXT;

-- Restore auto-increment ONLY if id has neither an identity setup nor a default.
-- (Hibernate-created tables use identity, which must not be altered.)
DO $$
DECLARE
    v_is_identity text;
    v_default     text;
BEGIN
    SELECT is_identity, column_default
      INTO v_is_identity, v_default
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'follow_ups'
       AND column_name  = 'id';

    IF v_is_identity = 'YES' OR v_default IS NOT NULL THEN
        RAISE NOTICE 'follow_ups.id already auto-generates values; leaving it unchanged.';
    ELSE
        CREATE SEQUENCE IF NOT EXISTS public.follow_ups_id_seq AS BIGINT;
        ALTER SEQUENCE public.follow_ups_id_seq OWNED BY public.follow_ups.id;
        ALTER TABLE public.follow_ups
            ALTER COLUMN id SET DEFAULT nextval('public.follow_ups_id_seq'::regclass);
        PERFORM setval(
            'public.follow_ups_id_seq'::regclass,
            COALESCE((SELECT MAX(id) FROM public.follow_ups), 0) + 1,
            FALSE
        );
    END IF;
END $$;

-- Existing rows, if any, must have timestamps before NOT NULL is applied.
UPDATE public.follow_ups
SET created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW());

ALTER TABLE public.follow_ups
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET NOT NULL;

-- 5. Reconcile foreign keys.
-- Replace the existing lead_id foreign key to ensure ON DELETE CASCADE.
DO $$
DECLARE
    fk RECORD;
BEGIN
    FOR fk IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN unnest(c.conkey) AS k(attnum) ON TRUE
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = k.attnum
        WHERE c.conrelid = 'public.follow_ups'::regclass
          AND c.contype = 'f'
          AND a.attname = 'lead_id'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.follow_ups DROP CONSTRAINT %I',
            fk.conname
        );
    END LOOP;
END $$;

ALTER TABLE public.follow_ups
    ADD CONSTRAINT fk_follow_ups_lead_id
    FOREIGN KEY (lead_id)
    REFERENCES public.leads(id)
    ON DELETE CASCADE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.follow_ups'::regclass
          AND conname = 'fk_follow_ups_created_by_user'
    ) THEN
        ALTER TABLE public.follow_ups
            ADD CONSTRAINT fk_follow_ups_created_by_user
            FOREIGN KEY (created_by_user_id)
            REFERENCES public.users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.follow_ups'::regclass
          AND conname = 'fk_follow_ups_owner_user'
    ) THEN
        ALTER TABLE public.follow_ups
            ADD CONSTRAINT fk_follow_ups_owner_user
            FOREIGN KEY (owner_user_id)
            REFERENCES public.users(id);
    END IF;
END $$;

-- 6. Create required indexes.
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id
    ON public.follow_ups (lead_id);

CREATE INDEX IF NOT EXISTS idx_follow_ups_owner_user_id
    ON public.follow_ups (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_at
    ON public.follow_ups (scheduled_at);

CREATE INDEX IF NOT EXISTS idx_follow_ups_deleted_at
    ON public.follow_ups (deleted_at);

CREATE INDEX IF NOT EXISTS idx_follow_ups_active_dashboard
    ON public.follow_ups (owner_user_id, scheduled_at)
    WHERE deleted_at IS NULL AND is_completed = FALSE;