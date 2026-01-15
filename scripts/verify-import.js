const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyImport() {
  console.log('🔍 Verifying Lead Import\n');

  try {
    // Get total count
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ Total leads in database: ${count}`);

    // Get status distribution
    const { data: statusData } = await supabase
      .from('leads')
      .select('status');

    const statusCounts = {};
    statusData.forEach(lead => {
      const status = lead.status || 'No status';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('\n📊 Status Distribution:');
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const percentage = ((count / statusData.length) * 100).toFixed(1);
        console.log(`   ${status}: ${count} (${percentage}%)`);
      });

    // Get relevance status distribution
    const { data: relevanceData } = await supabase
      .from('leads')
      .select('relevance_status');

    const relevanceCounts = {};
    relevanceData.forEach(lead => {
      const status = lead.relevance_status || 'No status';
      relevanceCounts[status] = (relevanceCounts[status] || 0) + 1;
    });

    console.log('\n📋 Relevance Status Distribution:');
    Object.entries(relevanceCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const percentage = ((count / relevanceData.length) * 100).toFixed(1);
        console.log(`   ${status}: ${count} (${percentage}%)`);
      });

    // Sample some leads
    const { data: samples } = await supabase
      .from('leads')
      .select('*')
      .limit(5);

    console.log('\n👁️  Sample Leads:');
    samples.forEach((lead, i) => {
      console.log(`\n   ${i + 1}. ${lead.lead_name}`);
      console.log(`      Phone: ${lead.phone}`);
      console.log(`      Status: ${lead.status}`);
      console.log(`      Relevance: ${lead.relevance_status}`);
      if (lead.agent_notes) {
        console.log(`      Notes: ${lead.agent_notes.substring(0, 50)}...`);
      }
    });

    console.log('\n✅ Import verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyImport();