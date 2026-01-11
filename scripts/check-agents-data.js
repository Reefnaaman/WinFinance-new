const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAgentsData() {
  console.log('🔍 Checking Agents Data\n');

  try {
    // 1. Get all agents from database
    console.log('📊 Database Agents:');
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching agents:', error);
    } else {
      console.log(`Found ${agents.length} agents in database:`);
      agents.forEach(agent => {
        console.log(`   ${agent.name} (ID: ${agent.id}) - Role: ${agent.role}`);
      });
    }

    // 2. Check Excel file for agent names
    console.log('\n📄 Excel Agent Distribution:');
    const excelPath = '/Users/reefnaaman/Downloads/גיליון ללא שם.xlsx';
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const rows = data.slice(1).filter(row => row.some(cell => cell));

    // Count agent names in column 6
    const agentCounts = {};
    let leadsWithAgents = 0;
    let leadsWithoutAgents = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const agentName = row[6]; // Column 6 is agent name

      if (agentName && agentName.trim()) {
        const cleanName = agentName.trim();
        agentCounts[cleanName] = (agentCounts[cleanName] || 0) + 1;
        leadsWithAgents++;
      } else {
        leadsWithoutAgents++;
      }
    }

    console.log(`\nAgent assignment summary:`);
    console.log(`   Leads WITH agents: ${leadsWithAgents} (${((leadsWithAgents/rows.length)*100).toFixed(1)}%)`);
    console.log(`   Leads WITHOUT agents: ${leadsWithoutAgents} (${((leadsWithoutAgents/rows.length)*100).toFixed(1)}%)`);

    console.log(`\nAgent name distribution in Excel:`);
    Object.entries(agentCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => {
        console.log(`   ${name}: ${count} leads`);
      });

    // 3. Check current database lead assignments
    console.log('\n📊 Current Database Lead Assignments:');
    const { data: leadStats } = await supabase
      .from('leads')
      .select('assigned_agent_id');

    const assignedCount = leadStats.filter(l => l.assigned_agent_id).length;
    const unassignedCount = leadStats.filter(l => !l.assigned_agent_id).length;

    console.log(`   Assigned leads: ${assignedCount}`);
    console.log(`   Unassigned leads: ${unassignedCount}`);
    console.log(`   Total: ${leadStats.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAgentsData();