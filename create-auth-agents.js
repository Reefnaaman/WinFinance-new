const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAuthAgents() {
  try {
    console.log('=== CREATING AGENT RECORDS WITH AUTH IDS ===\n');

    // Mapping of old agent IDs to auth IDs
    const migrations = [
      { oldId: 'a8a7e87c-2265-40f6-8378-2a97e26e148c', authId: '60010665-515a-4c4b-9c9c-f3c6b9fb35a0', name: 'יקיר' },
      { oldId: 'b02ae845-eb60-4e16-b879-fbc2e5d67e1e', authId: '977d2b7a-42e5-467b-9fb7-82f4d5ed301a', name: 'עדי' },
      { oldId: '2192f6d3-2102-4f31-866f-64b5cb68f33c', authId: 'b84e08a6-d500-49ea-981e-253a6beb6207', name: 'דור' },
      { oldId: '4af83165-9332-4f8d-8148-b1852960b6d4', authId: 'a6989ac1-3bfb-480c-8206-9ce84a173ba4', name: 'עידן' },
      { oldId: '3411f2e7-29e7-4c44-8d39-46367aa20f15', authId: 'd71e19e7-a64f-43f6-9c5a-0611f429e6ce', name: 'פלג' }
    ];

    for (const migration of migrations) {
      console.log(`\nProcessing ${migration.name}:`);

      // Get the old agent record
      const { data: oldAgent, error: fetchError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', migration.oldId)
        .single();

      if (fetchError || !oldAgent) {
        console.log(`  ❌ Old agent record not found`);
        continue;
      }

      console.log(`  Old ID: ${migration.oldId}`);
      console.log(`  New ID: ${migration.authId}`);

      // Create new agent with auth ID
      const newAgent = {
        id: migration.authId,
        name: oldAgent.name,
        email: oldAgent.email,
        role: oldAgent.role
      };

      console.log(`  Creating new agent record...`);
      const { error: insertError } = await supabase
        .from('agents')
        .insert([newAgent]);

      if (insertError) {
        console.error(`  ❌ Failed to create: ${insertError.message}`);
        continue;
      }

      console.log(`  ✅ Created new agent record`);

      // Update all leads
      console.log(`  Updating lead assignments...`);
      const { data: updatedLeads, error: updateError } = await supabase
        .from('leads')
        .update({ assigned_agent_id: migration.authId })
        .eq('assigned_agent_id', migration.oldId)
        .select();

      if (updateError) {
        console.error(`  ❌ Failed to update leads: ${updateError.message}`);
        // Rollback
        await supabase.from('agents').delete().eq('id', migration.authId);
        continue;
      }

      console.log(`  ✅ Updated ${updatedLeads?.length || 0} leads`);

      // Delete old agent
      console.log(`  Deleting old agent record...`);
      const { error: deleteError } = await supabase
        .from('agents')
        .delete()
        .eq('id', migration.oldId);

      if (deleteError) {
        console.error(`  ⚠️  Failed to delete old record: ${deleteError.message}`);
      } else {
        console.log(`  ✅ Deleted old agent record`);
      }

      console.log(`✅ Successfully migrated ${migration.name}`);
    }

    // Final verification
    console.log('\n=== FINAL VERIFICATION ===\n');
    const { data: finalAgents } = await supabase
      .from('agents')
      .select('*')
      .order('name');

    for (const agent of finalAgents) {
      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_agent_id', agent.id);

      console.log(`${agent.name} (${agent.email})`);
      console.log(`  ID: ${agent.id}`);
      console.log(`  Role: ${agent.role}`);
      console.log(`  Leads: ${count || 0}`);
      console.log('');
    }

    console.log('=== MIGRATION COMPLETE ===');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

createAuthAgents();