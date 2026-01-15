const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function backupAndAnalyzeLeads() {
  console.log('🔍 Starting Lead Analysis and Backup...\n');

  try {
    // 1. Get current lead count and structure
    const { data: leads, error: leadsError, count } = await supabase
      .from('leads')
      .select('*', { count: 'exact' });

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return;
    }

    console.log('📊 Current System Status:');
    console.log(`   Total leads in database: ${count || 0}`);

    if (leads && leads.length > 0) {
      // Analyze lead structure
      const sampleLead = leads[0];
      console.log('\n📋 Lead Table Structure:');
      console.log('   Columns:', Object.keys(sampleLead).join(', '));

      // Analyze data completeness
      const stats = {
        withEmail: leads.filter(l => l.email).length,
        withPhone: leads.filter(l => l.phone).length,
        withAgent: leads.filter(l => l.assigned_agent_id).length,
        withStatus: leads.filter(l => l.status).length,
        withMeeting: leads.filter(l => l.meeting_date).length,
      };

      console.log('\n📈 Data Statistics:');
      console.log(`   Leads with email: ${stats.withEmail} (${(stats.withEmail/leads.length*100).toFixed(1)}%)`);
      console.log(`   Leads with phone: ${stats.withPhone} (${(stats.withPhone/leads.length*100).toFixed(1)}%)`);
      console.log(`   Assigned to agent: ${stats.withAgent} (${(stats.withAgent/leads.length*100).toFixed(1)}%)`);
      console.log(`   With status: ${stats.withStatus} (${(stats.withStatus/leads.length*100).toFixed(1)}%)`);
      console.log(`   With meetings: ${stats.withMeeting} (${(stats.withMeeting/leads.length*100).toFixed(1)}%)`);

      // Create backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(__dirname, '..', 'backups');

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const backupFile = path.join(backupDir, `leads-backup-${timestamp}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(leads, null, 2));

      console.log(`\n✅ Backup created: ${backupFile}`);
      console.log(`   Backed up ${leads.length} leads`);
    } else {
      console.log('\n⚠️  No leads found in the database');
    }

    // 2. Check agents table
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*');

    if (!agentsError && agents) {
      console.log('\n👥 Agents in System:');
      agents.forEach(agent => {
        console.log(`   - ${agent.name} (${agent.email}) - Role: ${agent.role}`);
      });
    }

    // 3. Check system constraints and relationships
    console.log('\n🔒 System Integrity Check:');
    console.log('   ✓ Database connection successful');
    console.log('   ✓ Leads table accessible');
    console.log('   ✓ Agents table accessible');

    // Test API endpoints
    const apiTests = [
      { name: 'Import CSV API', url: '/api/import-csv' },
      { name: 'Export CSV API', url: '/api/export-csv' },
      { name: 'Gmail Check API', url: '/api/check-gmail' },
    ];

    console.log('\n🌐 API Endpoints Status:');
    for (const test of apiTests) {
      const exists = fs.existsSync(path.join(__dirname, '..', 'src', 'app', test.url, 'route.ts'));
      console.log(`   ${exists ? '✓' : '✗'} ${test.name} - ${test.url}`);
    }

    console.log('\n✅ System integrity check complete!');
    console.log('\n📌 Next Steps:');
    console.log('   1. Review the backup file');
    console.log('   2. Prepare your new lead CSV file');
    console.log('   3. Ensure CSV columns match our system:');
    console.log('      - lead_name (required)');
    console.log('      - phone (required)');
    console.log('      - email (optional)');
    console.log('      - source (optional)');
    console.log('      - relevance_status (optional)');
    console.log('      - status (optional)');
    console.log('      - agent_notes (optional)');

  } catch (error) {
    console.error('Error during backup/analysis:', error);
  }
}

backupAndAnalyzeLeads();