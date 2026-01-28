-- Add database-level constraints to prevent duplicate leads
-- This is the LAST LINE OF DEFENSE against duplicates

-- 1. Add unique constraint for phone number
-- This prevents exact same phone number from being added twice
ALTER TABLE leads
DROP CONSTRAINT IF EXISTS unique_lead_phone;

ALTER TABLE leads
ADD CONSTRAINT unique_lead_phone UNIQUE (phone);

-- 2. Create a function to normalize phone numbers before insert/update
CREATE OR REPLACE FUNCTION normalize_phone_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove all non-digit characters from phone
  NEW.phone := regexp_replace(NEW.phone, '[^0-9]', '', 'g');

  -- Ensure Israeli format (add leading 0 if missing for 9-digit numbers)
  IF length(NEW.phone) = 9 AND substring(NEW.phone, 1, 1) != '0' THEN
    NEW.phone := '0' || NEW.phone;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to normalize phone numbers
DROP TRIGGER IF EXISTS normalize_phone_before_insert ON leads;
CREATE TRIGGER normalize_phone_before_insert
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION normalize_phone_number();

-- 4. Normalize existing phone numbers
UPDATE leads
SET phone = regexp_replace(phone, '[^0-9]', '', 'g')
WHERE phone IS NOT NULL;

UPDATE leads
SET phone = '0' || phone
WHERE length(phone) = 9 AND substring(phone, 1, 1) != '0';

-- 5. Create index for faster duplicate checking
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_name_lower ON leads(LOWER(lead_name));
CREATE INDEX IF NOT EXISTS idx_leads_created_at_date ON leads(DATE(created_at));

-- 6. Add comment explaining the constraints
COMMENT ON CONSTRAINT unique_lead_phone ON leads IS 'Prevents duplicate leads with the same phone number - bulletproof database-level protection';