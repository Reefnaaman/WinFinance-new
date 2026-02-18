const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Generate a secure API key
function generateApiKey() {
  const prefix = 'wf_';
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `${prefix}${randomBytes}`;
}

async function generateApiKeys() {
  console.log('🔑 Generating API keys for agents...\n');

  try {
    // First, create the API keys table if it doesn't exist
    console.log('📊 Setting up API keys table...');

    // Get all agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, email, role')
      .order('name');

    if (agentsError) {
      console.error('❌ Error fetching agents:', agentsError);
      return;
    }

    console.log(`Found ${agents.length} agents\n`);

    // Check for existing API keys
    const { data: existingKeys } = await supabase
      .from('api_keys')
      .select('agent_id');

    const agentsWithKeys = new Set(existingKeys?.map(k => k.agent_id) || []);

    // Generate API keys for agents without them
    const apiKeysGenerated = [];

    for (const agent of agents) {
      if (agentsWithKeys.has(agent.id)) {
        console.log(`⏭️  ${agent.name} already has an API key`);
        continue;
      }

      const apiKey = generateApiKey();

      const { data: newKey, error: createError } = await supabase
        .from('api_keys')
        .insert({
          agent_id: agent.id,
          api_key: apiKey,
          name: `${agent.name} - Primary API Key`,
          permissions: { read: true, write: true }
        })
        .select()
        .single();

      if (createError) {
        console.error(`❌ Error creating API key for ${agent.name}:`, createError.message);
        continue;
      }

      console.log(`✅ Generated API key for ${agent.name} (${agent.role})`);
      apiKeysGenerated.push({
        agent_name: agent.name,
        agent_email: agent.email,
        agent_role: agent.role,
        api_key: apiKey,
        key_name: newKey.name
      });
    }

    // Display generated keys
    if (apiKeysGenerated.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('🔐 NEW API KEYS GENERATED - SAVE THESE SECURELY!');
      console.log('='.repeat(80) + '\n');

      for (const key of apiKeysGenerated) {
        console.log(`Agent: ${key.agent_name}`);
        console.log(`Email: ${key.agent_email}`);
        console.log(`Role: ${key.agent_role}`);
        console.log(`API Key: ${key.api_key}`);
        console.log('-'.repeat(40) + '\n');
      }

      console.log('⚠️  IMPORTANT: Save these API keys now! They cannot be retrieved later.');
      console.log('📋 Each agent should add this header to their API requests:');
      console.log('   X-API-Key: [their-api-key]\n');
    } else {
      console.log('\n✅ All agents already have API keys.');
    }

    // Show how to use the API
    console.log('\n📚 API Usage Example:');
    console.log('='.repeat(80));
    console.log(`
// JavaScript/Node.js example
const response = await fetch('https://winfinance.vercel.app/api/leads', {
  headers: {
    'X-API-Key': 'wf_your_api_key_here',
    'Content-Type': 'application/json'
  }
});

// cURL example
curl https://winfinance.vercel.app/api/leads \\
  -H "X-API-Key: wf_your_api_key_here"
`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
generateApiKeys();