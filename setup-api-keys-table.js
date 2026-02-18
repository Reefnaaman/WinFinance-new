const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupApiKeysTable() {
  console.log('🔧 Setting up API keys table in Supabase...\n');

  try {
    // Create the table and setup
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create API keys table for external API access
        CREATE TABLE IF NOT EXISTS api_keys (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
          api_key TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_used_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT true,
          permissions JSONB DEFAULT '{"read": true, "write": true}'::jsonb
        );

        -- Create index for faster API key lookup
        CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key) WHERE is_active = true;

        -- Create index for agent lookup
        CREATE INDEX IF NOT EXISTS idx_api_keys_agent_id ON api_keys(agent_id);
      `
    });

    if (createTableError) {
      // Try alternative approach without exec_sql
      console.log('⚠️  exec_sql not available, using direct SQL...');

      // We'll need to run this SQL directly in Supabase dashboard
      console.log('📋 Please run the following SQL in your Supabase SQL editor:\n');
      console.log('=' .repeat(80));
      console.log(`
-- Create API keys table for external API access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"read": true, "write": true}'::jsonb
);

-- Create index for faster API key lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key) WHERE is_active = true;

-- Create index for agent lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_agent_id ON api_keys(agent_id);

-- Add RLS policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage all API keys
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
      `);
      console.log('=' .repeat(80));
      console.log('\n✅ After running this SQL, run: node generate-api-keys.js\n');
      return;
    }

    console.log('✅ API keys table created successfully!');

    // Enable RLS
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if any
        DROP POLICY IF EXISTS "Admins can manage all API keys" ON api_keys;
        DROP POLICY IF EXISTS "Agents can view own API keys" ON api_keys;

        -- Only admins can manage all API keys
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
      `
    });

    if (rlsError) {
      console.log('⚠️  RLS policies might need manual setup');
    } else {
      console.log('✅ RLS policies configured');
    }

    console.log('\n📋 Next steps:');
    console.log('1. Run: node generate-api-keys.js to generate API keys for agents');
    console.log('2. Share the generated API keys securely with each agent');
    console.log('3. Agents should use the X-API-Key header in their requests');

  } catch (error) {
    console.error('❌ Error setting up API keys table:', error);

    console.log('\n📋 Manual setup required. Please run the SQL from create-api-keys-table.sql in Supabase SQL editor.');
  }
}

// Run the setup
setupApiKeysTable();