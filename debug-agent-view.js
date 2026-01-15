const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugAgentView() {
  try {
    console.log('=== DEBUGGING AGENT VIEW ISSUE ===\n');

    // 1. Check Auth Users
    console.log('1. CHECKING AUTH USERS:');
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    const yakir = users.find(u => u.email.toLowerCase().includes('yakir'));
    if (yakir) {
      console.log(`✅ Found Yakir in auth: ${yakir.email}`);
      console.log(`   Auth ID: ${yakir.id}`);
    } else {
      console.log('❌ Yakir not found in auth users');
      console.log('All auth users:');
      users.forEach(u => console.log(`   - ${u.email}`));
    }

    // 2. Check Agents Table
    console.log('\n2. CHECKING AGENTS TABLE:');
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from('agents')
      .select('*');

    const yakirAgent = agents.find(a => a.name.includes('יקיר') || a.email.toLowerCase().includes('yakir'));
    if (yakirAgent) {
      console.log(`✅ Found Yakir in agents table:`);
      console.log(`   Name: ${yakirAgent.name}`);
      console.log(`   Email: ${yakirAgent.email}`);
      console.log(`   Role: ${yakirAgent.role}`);
      console.log(`   Agent ID: ${yakirAgent.id}`);
    }

    // 3. Check Lead Assignment
    console.log('\n3. CHECKING LEAD ASSIGNMENTS:');
    if (yakirAgent) {
      const { data: leads, error: leadsError } = await supabaseAdmin
        .from('leads')
        .select('id, lead_name, assigned_agent_id, status, relevance_status')
        .eq('assigned_agent_id', yakirAgent.id)
        .limit(5);

      console.log(`   Yakir has ${leads?.length || 0} leads (showing max 5):`);
      leads?.forEach(lead => {
        console.log(`   - ${lead.lead_name} (${lead.status || 'No status'})`);
      });
    }

    // 4. Check RLS Policies
    console.log('\n4. TESTING CLIENT-SIDE QUERY (with RLS):');
    console.log('   Note: This uses the anon key, simulating client-side access');

    // Try to fetch leads as if from the client
    const { data: clientLeads, error: clientError } = await supabaseClient
      .from('leads')
      .select('*')
      .limit(5);

    if (clientError) {
      console.log(`   ❌ Client query error: ${clientError.message}`);
      console.log('   This suggests RLS policies might be blocking access');
    } else if (clientLeads && clientLeads.length > 0) {
      console.log(`   ✅ Client can see ${clientLeads.length} leads`);
    } else {
      console.log('   ⚠️  Client query returned 0 leads - RLS might be too restrictive');
    }

    // 5. Authentication Flow Issue
    console.log('\n5. POTENTIAL ISSUES IDENTIFIED:');
    console.log('   Issue 1: Agent user might not have matching auth account');
    console.log('   Issue 2: Email case sensitivity (Yakir@winfinance.co.il vs yakir@winfinance.co.il)');
    console.log('   Issue 3: RLS policies might be blocking agent access');
    console.log('   Issue 4: The user.id in AuthContext might not match agent.id in database');

    // 6. Check if IDs match
    if (yakir && yakirAgent) {
      console.log('\n6. ID MATCHING CHECK:');
      console.log(`   Auth User ID: ${yakir.id}`);
      console.log(`   Agent Table ID: ${yakirAgent.id}`);
      if (yakir.id !== yakirAgent.id) {
        console.log('   ❌ IDs DO NOT MATCH! This is the problem.');
        console.log('   The filtering logic uses user.id but it should match agent.id');
      } else {
        console.log('   ✅ IDs match');
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    process.exit();
  }
}

debugAgentView();