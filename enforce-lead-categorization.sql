-- Enforce that all new leads must have a relevance_status
-- This ensures no lead can be "uncategorized"

-- 1. Set default value for relevance_status column to 'ממתין לבדיקה' (waiting for review)
ALTER TABLE leads
ALTER COLUMN relevance_status SET DEFAULT 'ממתין לבדיקה';

-- 2. Add NOT NULL constraint to ensure relevance_status is always set
ALTER TABLE leads
ALTER COLUMN relevance_status SET NOT NULL;

-- 3. Update any existing NULL values (if any) to 'ממתין לבדיקה'
UPDATE leads
SET relevance_status = 'ממתין לבדיקה'
WHERE relevance_status IS NULL;

-- 4. Create a check constraint to ensure only valid values are used
ALTER TABLE leads
ADD CONSTRAINT valid_relevance_status
CHECK (relevance_status IN ('ממתין לבדיקה', 'רלוונטי', 'לא רלוונטי'));

-- 5. Create a trigger to ensure new leads always start as 'ממתין לבדיקה'
-- This prevents direct insertion with other statuses
CREATE OR REPLACE FUNCTION ensure_new_lead_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce for new records (INSERT)
  IF TG_OP = 'INSERT' THEN
    -- Force all new leads to start as 'ממתין לבדיקה'
    NEW.relevance_status := 'ממתין לבדיקה';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS enforce_new_lead_status ON leads;
CREATE TRIGGER enforce_new_lead_status
BEFORE INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION ensure_new_lead_status();

-- 6. Add a comment to document this business rule
COMMENT ON COLUMN leads.relevance_status IS 'Lead categorization status - all new leads MUST start as "ממתין לבדיקה" (waiting for review). No uncategorized leads allowed.';