const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupAndFixAgents() {
  try {
    console.log('=== CLEANING UP AND FIXING AGENT RECORDS ===\n');

    // Get all agents
    const { data: allAgents, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .order('created_at');

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

    // Group agents by email to find duplicates
    const agentsByEmail = {};
    allAgents.forEach(agent => {
      const email = agent.email.toLowerCase();
      if (!agentsByEmail[email]) {
        agentsByEmail[email] = [];
      }
      agentsByEmail[email].push(agent);
    });

    console.log('Found agents:');
    Object.entries(agentsByEmail).forEach(([email, agents]) => {
      console.log(`\n${email}: ${agents.length} record(s)`);
      agents.forEach(agent => {
        console.log(`  - ID: ${agent.id}, Name: ${agent.name}, Role: ${agent.role}`);
      });
    });

    console.log('\n--- FIXING RECORDS ---\n');

    for (const [email, agents] of Object.entries(agentsByEmail)) {
      // Find the auth user for this email
      const authUser = users.find(u => u.email.toLowerCase() === email);

      if (!authUser && email !== 'test@example.com') {
        console.log(`⚠️  No auth user for ${email}, skipping...`);
        continue;
      }

      if (agents.length > 1) {
        console.log(`\nFixing duplicates for ${email}:`);

        // Find the agent with matching auth ID
        const correctAgent = agents.find(a => a.id === authUser?.id);
        const wrongAgents = agents.filter(a => a.id !== authUser?.id);

        if (correctAgent) {
          console.log(`  ✅ Keeping agent with auth ID: ${correctAgent.id}`);

          // Update all leads from wrong agents to correct agent
          for (const wrongAgent of wrongAgents) {
            console.log(`  Migrating leads from ${wrongAgent.id} to ${correctAgent.id}...`);

            const { data: migratedLeads, error: migrateError } = await supabase
              .from('leads')
              .update({ assigned_agent_id: correctAgent.id })
              .eq('assigned_agent_id', wrongAgent.id);

            if (migrateError) {
              console.error(`    Error: ${migrateError.message}`);
            } else {
              console.log(`    Migrated leads successfully`);
            }

            // Delete the wrong agent record
            console.log(`  Deleting duplicate agent ${wrongAgent.id}...`);
            const { error: deleteError } = await supabase
              .from('agents')
              .delete()
              .eq('id', wrongAgent.id);

            if (deleteError) {
              console.error(`    Error: ${deleteError.message}`);
            } else {
              console.log(`    Deleted successfully`);
            }
          }
        } else if (authUser) {
          // No agent has the correct auth ID, need to create one
          console.log(`  No agent with auth ID found, need to fix...`);

          // Use the first agent's data but with auth ID
          const baseAgent = agents[0];
          const correctAgent = { ...baseAgent, id: authUser.id };
          delete correctAgent.created_at;

          // Create new agent with auth ID
          console.log(`  Creating agent with auth ID ${authUser.id}...`);
          const { error: insertError } = await supabase
            .from('agents')
            .insert([correctAgent]);

          if (!insertError) {
            // Migrate all leads to the new agent
            for (const oldAgent of agents) {
              console.log(`  Migrating leads from ${oldAgent.id} to ${authUser.id}...`);
              await supabase
                .from('leads')
                .update({ assigned_agent_id: authUser.id })
                .eq('assigned_agent_id', oldAgent.id);

              // Delete old agent
              console.log(`  Deleting old agent ${oldAgent.id}...`);
              await supabase
                .from('agents')
                .delete()
                .eq('id', oldAgent.id);
            }
            console.log(`  ✅ Fixed ${baseAgent.name}`);
          } else {
            console.error(`  Error creating agent: ${insertError.message}`);
          }
        }
      } else if (agents.length === 1 && authUser) {
        const agent = agents[0];
        if (agent.id !== authUser.id) {
          console.log(`\nFixing single agent ${agent.name}:`);
          console.log(`  Current ID: ${agent.id}`);
          console.log(`  Auth ID: ${authUser.id}`);

          // Create new agent with auth ID
          const correctAgent = { ...agent, id: authUser.id };
          delete correctAgent.created_at;

          const { error: insertError } = await supabase
            .from('agents')
            .insert([correctAgent]);

          if (!insertError) {
            // Migrate leads
            console.log(`  Migrating leads...`);
            await supabase
              .from('leads')
              .update({ assigned_agent_id: authUser.id })
              .eq('assigned_agent_id', agent.id);

            // Delete old agent
            console.log(`  Deleting old agent record...`);
            await supabase
              .from('agents')
              .delete()
              .eq('id', agent.id);

            console.log(`  ✅ Fixed successfully`);
          } else if (insertError.code === '23505') {
            console.log(`  Agent with auth ID already exists, cleaning up...`);
            // Just delete the wrong one
            await supabase
              .from('agents')
              .delete()
              .eq('id', agent.id);
          }
        } else {
          console.log(`✅ ${agent.name} - Already has correct ID`);
        }
      }
    }

    // Final verification
    console.log('\n--- FINAL VERIFICATION ---\n');
    const { data: finalAgents } = await supabase.from('agents').select('*');
    const { data: finalLeads } = await supabase
      .from('leads')
      .select('assigned_agent_id')
      .not('assigned_agent_id', 'is', null);

    console.log('Final agent list:');
    finalAgents?.forEach(agent => {
      const authUser = users.find(u => u.email.toLowerCase() === agent.email.toLowerCase());
      const match = authUser && agent.id === authUser.id ? '✅' : '❌';
      console.log(`${match} ${agent.name} (${agent.email}) - ID: ${agent.id}`);
    });

    console.log(`\nTotal agents: ${finalAgents?.length || 0}`);
    console.log(`Total assigned leads: ${finalLeads?.length || 0}`);

    console.log('\n=== CLEANUP COMPLETE ===');

  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    process.exit();
  }
}

cleanupAndFixAgents();