const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Agent name mapping to database IDs
const agentMapping = {
  'עדי בראל': 'b02ae845-eb60-4e16-b879-fbc2e5d67e1e',
  'עדי': 'b02ae845-eb60-4e16-b879-fbc2e5d67e1e',
  'יקיר': 'a8a7e87c-2265-40f6-8378-2a97e26e148c',
  'לפלג': '3411f2e7-29e7-4c44-8d39-46367aa20f15',
  'פלג': '3411f2e7-29e7-4c44-8d39-46367aa20f15',
  'דור': '2192f6d3-2102-4f31-866f-64b5cb68f33c',
  'דור לוסקי': '2192f6d3-2102-4f31-866f-64b5cb68f33c',
  'דןר': '2192f6d3-2102-4f31-866f-64b5cb68f33c', // Typo for דור
  'עידן': '4af83165-9332-4f8d-8148-b1852960b6d4',
  'אידן': '4af83165-9332-4f8d-8148-b1852960b6d4', // Alternative spelling
  'אוריאל': '625ea78e-73f4-4928-99f8-356ea816f374',
  'עידן  / יקיר': '4af83165-9332-4f8d-8148-b1852960b6d4' // Default to עידן for shared
};

async function updateAgentAssignments() {
  console.log('🔧 Updating Agent Assignments\n');

  try {
    // Read Excel file
    const excelPath = '/Users/reefnaaman/Downloads/גיליון ללא שם.xlsx';
    console.log('📖 Reading Excel file...');

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip header row
    const rows = data.slice(1).filter(row => row.some(cell => cell));

    // Get all current leads
    const { data: currentLeads, error: fetchError } = await supabase
      .from('leads')
      .select('id, lead_name, phone')
      .order('created_at');

    if (fetchError) {
      throw fetchError;
    }

    // Create a map of phone -> lead for quick lookup
    const leadMap = {};
    currentLeads.forEach(lead => {
      leadMap[lead.phone] = lead;
    });

    console.log(`Found ${currentLeads.length} leads in database`);

    // Process updates
    const updates = [];
    let assignmentCount = 0;
    let noMatchCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const leadName = row[5]?.trim();
      const phone = row[0];
      const agentName = row[6]?.trim();

      if (!leadName || !agentName) continue;

      // Clean phone number
      let cleanPhone = phone ? String(phone).replace(/\\D/g, '') : '';
      if (cleanPhone && !cleanPhone.startsWith('0')) {
        cleanPhone = '0' + cleanPhone;
      }

      // Find the lead in database
      const dbLead = leadMap[cleanPhone];

      if (dbLead) {
        // Get agent ID from mapping
        const agentId = agentMapping[agentName];

        if (agentId) {
          updates.push({
            id: dbLead.id,
            assigned_agent_id: agentId
          });
          assignmentCount++;
          console.log(`✓ Assigning "${leadName}" to ${agentName}`);
        } else {
          console.log(`⚠️ Unknown agent name: "${agentName}" for lead "${leadName}"`);
        }
      } else {
        noMatchCount++;
        console.log(`❌ No match found for "${leadName}" with phone ${cleanPhone}`);
      }
    }

    if (updates.length === 0) {
      console.log('\n⚠️ No updates to make');
      return;
    }

    console.log(`\n📝 Updating ${updates.length} lead assignments...`);

    // Update in batches
    const batchSize = 50;
    let updated = 0;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      // Update each lead individually
      for (const update of batch) {
        const { error: updateError } = await supabase
          .from('leads')
          .update({ assigned_agent_id: update.assigned_agent_id })
          .eq('id', update.id);

        if (updateError) {
          console.error(`Error updating lead ${update.id}:`, updateError);
        } else {
          updated++;
        }
      }

      console.log(`   Updated ${updated}/${updates.length} leads...`);
    }

    // Verify the updates
    console.log('\n📊 Verifying updates...');
    const { data: verifyData } = await supabase
      .from('leads')
      .select('assigned_agent_id')
      .not('assigned_agent_id', 'is', null);

    console.log(`\n✅ Update Complete!`);
    console.log(`   Successfully assigned ${verifyData.length} leads to agents`);
    console.log(`   ${currentLeads.length - verifyData.length} leads remain unassigned`);

    // Show agent distribution
    const { data: agentStats } = await supabase
      .from('leads')
      .select('assigned_agent_id, agents!inner(name)')
      .not('assigned_agent_id', 'is', null);

    const agentCounts = {};
    agentStats.forEach(lead => {
      const name = lead.agents.name;
      agentCounts[name] = (agentCounts[name] || 0) + 1;
    });

    console.log('\n📊 Agent Distribution:');
    Object.entries(agentCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => {
        console.log(`   ${name}: ${count} leads`);
      });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

updateAgentAssignments();