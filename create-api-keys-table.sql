-- Create API keys table for external API access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL, -- Description like "Mobile App", "Partner CRM"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"read": true, "write": true}'::jsonb
);

-- Create index for faster API key lookup
CREATE INDEX idx_api_keys_api_key ON api_keys(api_key) WHERE is_active = true;

-- Create index for agent lookup
CREATE INDEX idx_api_keys_agent_id ON api_keys(agent_id);

-- Add RLS policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage API keys
CREATE POLICY "Admins can manage all API keys" ON api_keys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = auth.uid()
      AND agents.role = 'admin'
    )
  );

-- Agents can view their own API keys
CREATE POLICY "Agents can view own API keys" ON api_keys
  FOR SELECT USING (
    agent_id = auth.uid()
  );

-- Function to generate secure API key
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := 'wf_'; -- Prefix to identify WinFinance keys
  i INTEGER;
BEGIN
  -- Generate 32 character random string after prefix
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Insert API keys for existing agents (optional - run manually if needed)
-- INSERT INTO api_keys (agent_id, api_key, name)
-- SELECT
--   id,
--   generate_api_key(),
--   name || ' - API Key'
-- FROM agents
-- WHERE role IN ('agent', 'coordinator', 'admin');