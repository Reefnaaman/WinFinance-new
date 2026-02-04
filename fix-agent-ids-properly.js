const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAgentIdsProperty() {
  try {
    console.log('=== FIXING AGENT ID MISMATCH (PROPER METHOD) ===\n');

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

    console.log('Processing agents...\n');

    for (const agent of agents) {
      // Find matching auth user by email (case-insensitive)
      const authUser = users.find(u => u.email.toLowerCase() === agent.email.toLowerCase());

      if (!authUser) {
        console.log(`⚠️  No auth user found for agent: ${agent.name} (${agent.email})`);
        continue;
      }

      if (agent.id !== authUser.id) {
        console.log(`Processing ${agent.name}:`);
        console.log(`  Old Agent ID: ${agent.id}`);
        console.log(`  New Auth ID: ${authUser.id}`);

        // Step 1: Create new agent record with auth ID
        const newAgent = { ...agent, id: authUser.id };
        delete newAgent.created_at; // Remove auto-generated fields

        const { error: insertError } = await supabase
          .from('agents')
          .insert([newAgent]);

        if (insertError) {
          if (insertError.code === '23505') {
            console.log(`  Agent with auth ID already exists, skipping...`);
          } else {
            console.error(`  Error creating new agent: ${insertError.message}`);
          }
          continue;
        }

        // Step 2: Update all leads to point to new agent ID
        const { data: updatedLeads, error: leadsUpdateError } = await supabase
          .from('leads')
          .update({ assigned_agent_id: authUser.id })
          .eq('assigned_agent_id', agent.id);

        if (leadsUpdateError) {
          console.error(`  Error updating leads: ${leadsUpdateError.message}`);
          // Rollback - delete the new agent record
          await supabase.from('agents').delete().eq('id', authUser.id);
          continue;
        }

        // Step 3: Delete old agent record
        const { error: deleteError } = await supabase
          .from('agents')
          .delete()
          .eq('id', agent.id);

        if (deleteError) {
          console.error(`  Error deleting old agent: ${deleteError.message}`);
        } else {
          console.log(`  ✅ Successfully migrated ${agent.name} to auth ID`);
        }

      } else {
        console.log(`✅ ${agent.name} - IDs already match`);
      }
    }

    // Verify the fix
    console.log('\n=== VERIFICATION ===');
    const { data: verifyAgents } = await supabase.from('agents').select('*');
    const { data: verifyLeads } = await supabase.from('leads').select('assigned_agent_id').not('assigned_agent_id', 'is', null);

    console.log(`Total agents: ${verifyAgents?.length || 0}`);
    console.log(`Total assigned leads: ${verifyLeads?.length || 0}`);

    // Check if all assigned leads have valid agent IDs
    const agentIds = new Set(verifyAgents?.map(a => a.id) || []);
    const invalidLeads = verifyLeads?.filter(l => !agentIds.has(l.assigned_agent_id)) || [];

    if (invalidLeads.length > 0) {
      console.log(`⚠️  Found ${invalidLeads.length} leads with invalid agent IDs`);
    } else {
      console.log('✅ All lead assignments are valid!');
    }

    console.log('\n=== FIX COMPLETE ===');
    console.log('Agents should now be able to see their assigned leads.');

  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    process.exit();
  }
}

fixAgentIdsProperty();