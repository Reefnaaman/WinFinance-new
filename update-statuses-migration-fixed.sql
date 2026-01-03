-- Migration Script: Update Lead Statuses and Relevance Statuses
-- Date: 2025-12-30
-- Description:
-- 1. Replace "לקוח לא \n  רצה" with "התקיימה - כשלון" in lead_status_enum
-- 2. Add "במעקב" to relevance_status_enum

-- Step 1: Add the new status value to the lead_status_enum
ALTER TYPE lead_status_enum ADD VALUE IF NOT EXISTS 'התקיימה - כשלון';

-- Step 2: Update all existing records with the old status to use the new status
-- Note: The old status has a line break in it: 'לקוח לא \n  רצה'
UPDATE leads
SET status = 'התקיימה - כשלון'
WHERE status = E'לקוח לא \n  רצה';

-- Alternative if the above doesn't work, try this:
-- UPDATE leads
-- SET status = 'התקיימה - כשלון'
-- WHERE status LIKE 'לקוח לא%רצה';

-- Step 3: Add "במעקב" to relevance_status_enum
ALTER TYPE relevance_status_enum ADD VALUE IF NOT EXISTS 'במעקב';

-- Check what statuses actually exist in the database
SELECT DISTINCT status, COUNT(*) as count
FROM leads
WHERE status IS NOT NULL
GROUP BY status
ORDER BY count DESC;

-- Check the current enum values
SELECT unnest(enum_range(NULL::lead_status_enum)) AS lead_status_values;
SELECT unnest(enum_range(NULL::relevance_status_enum)) AS relevance_status_values;