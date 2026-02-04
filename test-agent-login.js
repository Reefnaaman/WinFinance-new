const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAgentLogin() {
  try {
    console.log('=== TESTING AGENT LOGIN FLOW ===\n');

    // Try to sign in as Yakir
    console.log('1. Attempting to sign in as Yakir...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'yakir@winfinance.co.il',
      password: 'Dvir2025!' // Using the password we know works
    });

    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
      return;
    }

    console.log('✅ Sign in successful!');
    console.log('User ID from auth:', signInData.user.id);

    // Now test fetching user data from agents table
    console.log('\n2. Fetching agent data...');
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('email', 'yakir@winfinance.co.il')
      .single();

    if (agentError) {
      console.error('❌ Agent fetch failed:', agentError.message);
      return;
    }

    console.log('✅ Agent data found:');
    console.log('  Name:', agent.name);
    console.log('  Role:', agent.role);
    console.log('  Agent ID:', agent.id);
    console.log('  Match with auth ID:', agent.id === signInData.user.id ? '✅' : '❌');

    // Now test fetching leads assigned to this agent
    console.log('\n3. Testing lead filtering logic...');
    const { data: allLeads, error: leadsError } = await supabase
      .from('leads')
      .select('*');

    if (leadsError) {
      console.error('❌ Leads fetch failed:', leadsError.message);
      return;
    }

    console.log(`Total leads in database: ${allLeads.length}`);

    // Simulate the filtering logic from FullDashboard
    const agentLeads = allLeads.filter(lead => {
      // This is the exact logic from FullDashboard.tsx line 220
      if (agent.role === 'agent') {
        return lead.assigned_agent_id === agent.id;
      }
      return true;
    });

    console.log(`Leads matching agent ID (${agent.id}): ${agentLeads.length}`);

    if (agentLeads.length > 0) {
      console.log('Sample leads:');
      agentLeads.slice(0, 3).forEach(lead => {
        console.log(`  - ${lead.lead_name} (ID: ${lead.id}, Assigned: ${lead.assigned_agent_id})`);
      });
    } else {
      console.log('❌ NO LEADS FOUND FOR AGENT!');

      // Let's check what assigned_agent_ids exist
      const uniqueAssignedIds = [...new Set(allLeads.map(l => l.assigned_agent_id).filter(Boolean))];
      console.log('\nAssigned agent IDs in database:');
      uniqueAssignedIds.forEach(id => {
        const count = allLeads.filter(l => l.assigned_agent_id === id).length;
        console.log(`  ${id}: ${count} leads`);
      });

      console.log(`\nLooking for agent ID: ${agent.id}`);
      console.log(`Does it exist in assigned IDs? ${uniqueAssignedIds.includes(agent.id)}`);
    }

    // Test RLS policies
    console.log('\n4. Testing RLS with actual agent session...');
    const { data: rlsLeads, error: rlsError } = await supabase
      .from('leads')
      .select('*')
      .eq('assigned_agent_id', agent.id);

    if (rlsError) {
      console.error('❌ RLS test failed:', rlsError.message);
    } else {
      console.log(`✅ RLS allows agent to see ${rlsLeads.length} leads`);
    }

    // Sign out
    await supabase.auth.signOut();

  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    process.exit();
  }
}

testAgentLogin();