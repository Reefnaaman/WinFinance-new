const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDuplicates() {
  try {
    // Get all leads named איתן מלאי
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .ilike('lead_name', '%איתן מלאי%')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Found', leads.length, 'leads with name containing איתן מלאי');

    if (leads.length === 0) {
      console.log('No duplicates found.');
      return;
    }

    // Group by exact name
    const grouped = {};
    leads.forEach(lead => {
      const name = lead.lead_name.trim();
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(lead);
    });

    // Show summary
    Object.entries(grouped).forEach(([name, items]) => {
      console.log(`\n"${name}": ${items.length} entries`);

      // Show first few entries with details
      items.slice(0, 5).forEach((lead, index) => {
        console.log(`  ${index + 1}. ID: ${lead.id}`);
        console.log(`     Created: ${new Date(lead.created_at).toLocaleString('he-IL')}`);
        console.log(`     Phone: ${lead.phone || 'N/A'}, Email: ${lead.email || 'N/A'}`);
        console.log(`     Source: ${lead.source}, Status: ${lead.relevance_status}`);
        console.log(`     Agent: ${lead.assigned_agent_id || 'Unassigned'}`);
      });

      if (items.length > 5) {
        console.log(`  ... and ${items.length - 5} more`);
      }
    });

    // Check for potential duplicate creation patterns
    console.log('\n--- Analyzing creation patterns ---');

    // Sort by creation time
    const sortedLeads = leads.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Look for leads created within minutes of each other
    for (let i = 1; i < sortedLeads.length; i++) {
      const prev = sortedLeads[i-1];
      const curr = sortedLeads[i];

      const timeDiff = (new Date(curr.created_at) - new Date(prev.created_at)) / 1000; // seconds

      if (timeDiff < 300) { // Within 5 minutes
        console.log(`\nSuspicious: Two entries created ${Math.round(timeDiff)}s apart:`);
        console.log(`  1. ${new Date(prev.created_at).toLocaleString('he-IL')} - Source: ${prev.source}`);
        console.log(`  2. ${new Date(curr.created_at).toLocaleString('he-IL')} - Source: ${curr.source}`);
      }
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

checkDuplicates();