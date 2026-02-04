const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAgentLeads() {
  try {
    // First, get all agents
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .order('name');

    if (agentError) {
      console.error('Error fetching agents:', agentError);
      return;
    }

    console.log('=== AGENTS IN DATABASE ===');
    agents.forEach(agent => {
      console.log(`${agent.name} (${agent.email}) - Role: ${agent.role} - ID: ${agent.id}`);
    });

    // Find Yakir specifically
    const yakir = agents.find(a => a.name.includes('יקיר') || a.name.toLowerCase().includes('yakir'));

    if (!yakir) {
      console.log('\n❌ Yakir not found in agents table!');
    } else {
      console.log(`\n✅ Found Yakir: ${yakir.name} (ID: ${yakir.id})`);

      // Get leads assigned to Yakir
      const { data: yakirLeads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_agent_id', yakir.id);

      if (leadsError) {
        console.error('Error fetching Yakir\'s leads:', leadsError);
      } else {
        console.log(`\n📊 Yakir has ${yakirLeads.length} leads assigned`);
        if (yakirLeads.length > 0) {
          console.log('Sample leads:');
          yakirLeads.slice(0, 3).forEach(lead => {
            console.log(`  - ${lead.lead_name} (Status: ${lead.status || 'No status'}, Relevance: ${lead.relevance_status})`);
          });
        }
      }
    }

    // Check total leads distribution
    console.log('\n=== LEAD DISTRIBUTION ===');
    const { data: allLeads, error: allLeadsError } = await supabase
      .from('leads')
      .select('assigned_agent_id, relevance_status');

    if (!allLeadsError) {
      const assigned = allLeads.filter(l => l.assigned_agent_id).length;
      const unassigned = allLeads.filter(l => !l.assigned_agent_id).length;
      const relevant = allLeads.filter(l => l.relevance_status === 'רלוונטי').length;

      console.log(`Total leads: ${allLeads.length}`);
      console.log(`Assigned leads: ${assigned}`);
      console.log(`Unassigned leads: ${unassigned}`);
      console.log(`Relevant leads: ${relevant}`);

      // Count by agent
      console.log('\nLeads per agent:');
      const agentCounts = {};
      allLeads.forEach(lead => {
        if (lead.assigned_agent_id) {
          agentCounts[lead.assigned_agent_id] = (agentCounts[lead.assigned_agent_id] || 0) + 1;
        }
      });

      agents.forEach(agent => {
        const count = agentCounts[agent.id] || 0;
        if (count > 0 || agent.role === 'agent') {
          console.log(`  ${agent.name}: ${count} leads`);
        }
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    process.exit();
  }
}

checkAgentLeads();