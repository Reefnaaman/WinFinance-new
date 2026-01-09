-- SQL Migration: Add 'אין מענה' to relevance_status_enum only
-- Run this in Supabase SQL Editor
-- Note: 'אין מענה - לתאם מחדש' already exists in lead_status_enum

-- Add 'אין מענה' to relevance_status_enum for coordinator view
BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'אין מענה'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'relevance_status_enum')
    ) THEN
        ALTER TYPE relevance_status_enum ADD VALUE 'אין מענה';
    END IF;
END $$;

COMMIT;

-- 2. Verify the enum has been updated
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'relevance_status_enum')
ORDER BY enumsortorder;