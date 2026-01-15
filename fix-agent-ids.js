const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAgentIds() {
  try {
    console.log('=== FIXING AGENT ID MISMATCH ===\n');

    // Get all agents from the database
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('*');

    if (agentError) {
      console.error('Error fetching agents:', agentError);
      return;
    }

    // Get all auth users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    console.log('Checking agent/auth ID synchronization...\n');

    for (const agent of agents) {
      // Find matching auth user by email (case-insensitive)
      const authUser = users.find(u => u.email.toLowerCase() === agent.email.toLowerCase());

      if (!authUser) {
        console.log(`⚠️  No auth user found for agent: ${agent.name} (${agent.email})`);
        continue;
      }

      if (agent.id !== authUser.id) {
        console.log(`❌ ID mismatch for ${agent.name}:`);
        console.log(`   Agent ID: ${agent.id}`);
        console.log(`   Auth ID: ${authUser.id}`);

        // We have two options:
        // Option 1: Update the agent ID to match the auth ID
        // Option 2: Update all lead assignments to use the auth ID

        // Let's use Option 1 - Update agent ID to match auth ID
        // First, update all leads that reference this agent
        console.log(`   Updating lead assignments...`);
        const { data: updatedLeads, error: leadsUpdateError } = await supabase
          .from('leads')
          .update({ assigned_agent_id: authUser.id })
          .eq('assigned_agent_id', agent.id);

        if (leadsUpdateError) {
          console.error(`   Error updating leads: ${leadsUpdateError.message}`);
          continue;
        }

        // Then update the agent record
        console.log(`   Updating agent record...`);
        const { data: updatedAgent, error: agentUpdateError } = await supabase
          .from('agents')
          .update({ id: authUser.id })
          .eq('id', agent.id);

        if (agentUpdateError) {
          // If we can't update the ID (it's a primary key), we need to recreate the record
          console.log(`   Cannot update primary key, recreating agent record...`);

          // Delete old record
          await supabase.from('agents').delete().eq('id', agent.id);

          // Insert new record with correct ID
          const newAgent = { ...agent, id: authUser.id };
          const { error: insertError } = await supabase
            .from('agents')
            .insert([newAgent]);

          if (insertError) {
            console.error(`   Error recreating agent: ${insertError.message}`);
          } else {
            console.log(`   ✅ Fixed ${agent.name} - now using auth ID: ${authUser.id}`);
          }
        } else {
          console.log(`   ✅ Fixed ${agent.name} - now using auth ID: ${authUser.id}`);
        }
      } else {
        console.log(`✅ ${agent.name} - IDs already match (${agent.id})`);
      }
    }

    console.log('\n=== FIX COMPLETE ===');
    console.log('Agents should now be able to see their assigned leads.');

  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    process.exit();
  }
}

fixAgentIds();