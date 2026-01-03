-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view own tokens" ON gmail_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON gmail_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON gmail_tokens;

-- Disable RLS temporarily to allow reading
ALTER TABLE gmail_tokens DISABLE ROW LEVEL SECURITY;

-- Or if you want to keep RLS but make it more permissive:
-- ALTER TABLE gmail_tokens ENABLE ROW LEVEL SECURITY;

-- Create a more permissive policy for authenticated users to read any tokens
-- This is suitable for admin/coordinator roles
-- CREATE POLICY "Authenticated users can view tokens" ON gmail_tokens
--   FOR SELECT
--   USING (auth.role() = 'authenticated');

-- CREATE POLICY "Service role can do everything" ON gmail_tokens
--   FOR ALL
--   USING (auth.role() = 'service_role');