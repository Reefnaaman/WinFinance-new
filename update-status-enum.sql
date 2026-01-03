-- Update status enum to include the 4 new agent statuses
-- These need to be added to the existing enum to support the agent workflow

-- Add the new status values to the enum
ALTER TYPE lead_status_enum ADD VALUE 'אין מענה - לתאם מחדש';
ALTER TYPE lead_status_enum ADD VALUE 'התקיימה - נכשל';
ALTER TYPE lead_status_enum ADD VALUE 'התקיימה - נחתם';
ALTER TYPE lead_status_enum ADD VALUE 'התקיימה - במעקב';

-- Verify all current enum values
SELECT unnest(enum_range(NULL::lead_status_enum)) AS status_values;