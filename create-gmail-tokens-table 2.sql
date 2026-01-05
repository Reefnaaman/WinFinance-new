-- Create table for storing Gmail OAuth tokens
CREATE TABLE IF NOT EXISTS gmail_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT UNIQUE NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gmail_tokens_email ON gmail_tokens(user_email);

-- Add RLS policies
ALTER TABLE gmail_tokens ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can see their own tokens
CREATE POLICY "Users can view own tokens" ON gmail_tokens
  FOR SELECT
  USING (auth.jwt() ->> 'email' = user_email);

-- Only authenticated users can insert their own tokens
CREATE POLICY "Users can insert own tokens" ON gmail_tokens
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- Only authenticated users can update their own tokens
CREATE POLICY "Users can update own tokens" ON gmail_tokens
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = user_email);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gmail_tokens_updated_at BEFORE UPDATE ON gmail_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();