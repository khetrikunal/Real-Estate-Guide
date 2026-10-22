-- V15: Add custom_city_id and area_id FK columns to users table (PostgreSQL).
-- Safe to run even if Hibernate already created the columns or foreign keys.
-- The deprecated assigned_city / assigned_area columns are kept for backward compatibility.

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS custom_city_id BIGINT,
    ADD COLUMN IF NOT EXISTS area_id BIGINT;

-- Backfill custom_city_id from assigned_city (only if the needed columns exist).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='users' AND column_name='assigned_city')
       AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='custom_cities' AND column_name='city')
    THEN
        UPDATE public.users u
           SET custom_city_id = cc.id
          FROM public.custom_cities cc
         WHERE LOWER(cc.city) = LOWER(u.assigned_city)
           AND u.assigned_city IS NOT NULL
           AND u.custom_city_id IS NULL;
    ELSE
        RAISE NOTICE 'Skipping custom_city_id backfill: required columns not found.';
    END IF;
END $$;

-- Backfill area_id from assigned_area + assigned_city (only if the needed columns exist).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='users' AND column_name='assigned_area')
       AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='users' AND column_name='assigned_city')
       AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='areas' AND column_name='name')
       AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='areas' AND column_name='city')
    THEN
        UPDATE public.users u
           SET area_id = a.id
          FROM public.areas a
         WHERE LOWER(a.name) = LOWER(u.assigned_area)
           AND LOWER(a.city) = LOWER(u.assigned_city)
           AND u.assigned_area IS NOT NULL
           AND u.area_id IS NULL;
    ELSE
        RAISE NOTICE 'Skipping area_id backfill: required columns not found.';
    END IF;
END $$;

-- Add the foreign keys only if no FK already exists on those columns.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.conrelid = 'public.users'::regclass
          AND c.contype = 'f'
          AND a.attname = 'custom_city_id'
    ) THEN
        IF EXISTS (SELECT 1 FROM public.users u
                   WHERE u.custom_city_id IS NOT NULL
                     AND NOT EXISTS (SELECT 1 FROM public.custom_cities cc WHERE cc.id = u.custom_city_id)) THEN
            RAISE EXCEPTION 'users.custom_city_id has values that do not exist in custom_cities. Fix this data first.';
        END IF;
        ALTER TABLE public.users
            ADD CONSTRAINT fk_users_custom_city
            FOREIGN KEY (custom_city_id) REFERENCES public.custom_cities (id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.conrelid = 'public.users'::regclass
          AND c.contype = 'f'
          AND a.attname = 'area_id'
    ) THEN
        IF EXISTS (SELECT 1 FROM public.users u
                   WHERE u.area_id IS NOT NULL
                     AND NOT EXISTS (SELECT 1 FROM public.areas a WHERE a.id = u.area_id)) THEN
            RAISE EXCEPTION 'users.area_id has values that do not exist in areas. Fix this data first.';
        END IF;
        ALTER TABLE public.users
            ADD CONSTRAINT fk_users_area
            FOREIGN KEY (area_id) REFERENCES public.areas (id) ON DELETE SET NULL;
    END IF;
END $$;