-- Migration Script: Update Lead Statuses and Relevance Statuses
-- Date: 2025-12-30
-- Description:
-- 1. Replace "לקוח לא רצה" with "התקיימה - כשלון" in lead_status_enum
-- 2. Add "במעקב" to relevance_status_enum

-- Step 1: Add the new status value to the lead_status_enum
ALTER TYPE lead_status_enum ADD VALUE IF NOT EXISTS 'התקיימה - כשלון';

-- Step 2: Update all existing records with the old status to use the new status
UPDATE leads
SET status = 'התקיימה - כשלון'
WHERE status = 'לקוח לא רצה' OR status = 'לקוח לא
  רצה';

-- Step 3: Add "במעקב" to relevance_status_enum
ALTER TYPE relevance_status_enum ADD VALUE IF NOT EXISTS 'במעקב';

-- Note: In PostgreSQL, you cannot remove values from an enum type directly.
-- The old value "לקוח לא רצה" will remain in the enum but won't be used.
-- If you want to completely remove it, you would need to:
-- 1. Create a new enum type
-- 2. Update all columns to use the new type
-- 3. Drop the old type
-- This is a more complex operation and should be done with care.

-- Optional: View the current enum values to verify the changes
-- SELECT unnest(enum_range(NULL::lead_status_enum)) AS lead_status_values;
-- SELECT unnest(enum_range(NULL::relevance_status_enum)) AS relevance_status_values;

-- Optional: Check how many records were updated
-- SELECT status, COUNT(*) as count
-- FROM leads
-- GROUP BY status
-- ORDER BY count DESC;