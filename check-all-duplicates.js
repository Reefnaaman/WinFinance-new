const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllDuplicates() {
  try {
    // Get all leads
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, lead_name, phone, email, source, created_at, relevance_status')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`Checking ${leads.length} total leads for duplicates...`);

    // Group by name to find duplicates
    const nameGroups = {};
    leads.forEach(lead => {
      const name = lead.lead_name.trim().toLowerCase();
      if (!nameGroups[name]) nameGroups[name] = [];
      nameGroups[name].push(lead);
    });

    // Find duplicates (groups with more than one entry)
    const duplicates = Object.entries(nameGroups).filter(([name, items]) => items.length > 1);

    console.log(`\nFound ${duplicates.length} names with duplicates:`);

    duplicates
      .sort((a, b) => b[1].length - a[1].length) // Sort by most duplicates first
      .slice(0, 10) // Show top 10
      .forEach(([name, items]) => {
        console.log(`\n"${items[0].lead_name}" (${items.length} entries):`);

        items.slice(0, 3).forEach((lead, index) => {
          console.log(`  ${index + 1}. Created: ${new Date(lead.created_at).toLocaleString('he-IL')}`);
          console.log(`     Phone: ${lead.phone || 'N/A'}, Source: ${lead.source}`);
        });

        if (items.length > 3) {
          console.log(`  ... and ${items.length - 3} more`);
        }
      });

    // Look for איתן specifically
    const eitanLeads = leads.filter(lead =>
      lead.lead_name.includes('איתן') || lead.lead_name.includes('איתן')
    );

    if (eitanLeads.length > 0) {
      console.log(`\n--- Found ${eitanLeads.length} leads with "איתן" in name ---`);
      eitanLeads.forEach(lead => {
        console.log(`"${lead.lead_name}" - Created: ${new Date(lead.created_at).toLocaleString('he-IL')}`);
      });
    }

    // Check recent creations (last 48 hours)
    const recent = leads.filter(lead => {
      const createdTime = new Date(lead.created_at);
      const now = new Date();
      return (now - createdTime) < (48 * 60 * 60 * 1000); // 48 hours
    });

    if (recent.length > 0) {
      console.log(`\n--- ${recent.length} leads created in last 48 hours ---`);

      // Group recent ones by name too
      const recentGroups = {};
      recent.forEach(lead => {
        const name = lead.lead_name.trim();
        if (!recentGroups[name]) recentGroups[name] = [];
        recentGroups[name].push(lead);
      });

      Object.entries(recentGroups)
        .filter(([name, items]) => items.length > 1)
        .forEach(([name, items]) => {
          console.log(`\nRecent duplicate: "${name}" (${items.length} times)`);
          items.forEach(lead => {
            console.log(`  - ${new Date(lead.created_at).toLocaleString('he-IL')} from ${lead.source}`);
          });
        });
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

checkAllDuplicates();