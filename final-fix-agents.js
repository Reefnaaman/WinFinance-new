const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function finalFixAgents() {
  try {
    console.log('=== FINAL FIX FOR AGENT IDS ===\n');

    // Get all auth users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    // Get all current agents
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('*');
    if (agentError) throw agentError;

    console.log('Current state:');
    console.log('Auth users:', users.length);
    console.log('Agent records:', agents.length);
    console.log('');

    // Process each auth user
    for (const authUser of users) {
      const agent = agents.find(a => a.email.toLowerCase() === authUser.email.toLowerCase());

      if (!agent) {
        console.log(`⚠️  No agent record for auth user ${authUser.email}`);
        continue;
      }

      if (agent.id === authUser.id) {
        console.log(`✅ ${agent.name} - Already correct`);
        continue;
      }

      console.log(`\nFixing ${agent.name}:`);
      console.log(`  Old Agent ID: ${agent.id}`);
      console.log(`  New Auth ID: ${authUser.id}`);

      // Step 1: Create new agent record with auth ID
      const newAgent = {
        id: authUser.id,
        name: agent.name,
        email: agent.email,
        role: agent.role
      };

      console.log('  Creating new agent record...');
      const { error: insertError } = await supabase
        .from('agents')
        .insert([newAgent]);

      if (insertError && insertError.code !== '23505') {
        console.error(`  Failed to create: ${insertError.message}`);
        continue;
      } else if (insertError?.code === '23505') {
        console.log('  Agent with auth ID already exists');
      } else {
        console.log('  ✅ Created new agent record');
      }

      // Step 2: Update all leads
      console.log('  Updating lead assignments...');
      const { data: updatedLeads, error: updateError } = await supabase
        .from('leads')
        .update({ assigned_agent_id: authUser.id })
        .eq('assigned_agent_id', agent.id)
        .select();

      if (updateError) {
        console.error(`  Failed to update leads: ${updateError.message}`);
        // Rollback if we created a new agent
        if (!insertError) {
          await supabase.from('agents').delete().eq('id', authUser.id);
        }
        continue;
      }

      console.log(`  ✅ Updated ${updatedLeads?.length || 0} leads`);

      // Step 3: Delete old agent record
      console.log('  Deleting old agent record...');
      const { error: deleteError } = await supabase
        .from('agents')
        .delete()
        .eq('id', agent.id);

      if (deleteError) {
        console.error(`  Failed to delete old record: ${deleteError.message}`);
      } else {
        console.log('  ✅ Deleted old agent record');
      }

      console.log(`✅ Successfully migrated ${agent.name}`);
    }

    // Verify the fix
    console.log('\n=== VERIFICATION ===\n');
    const { data: finalAgents } = await supabase.from('agents').select('*');

    console.log('Final status:');
    for (const agent of finalAgents) {
      const authUser = users.find(u => u.email.toLowerCase() === agent.email.toLowerCase());
      const status = authUser && agent.id === authUser.id ? '✅' : '❌';
      const leadCount = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_agent_id', agent.id);

      console.log(`${status} ${agent.name} (${agent.email})`);
      console.log(`    ID: ${agent.id}`);
      console.log(`    Leads: ${leadCount.count || 0}`);
    }

    console.log('\n=== FIX COMPLETE ===');
    console.log('Agents should now be able to see their assigned leads!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

finalFixAgents();