const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupDuplicates() {
  console.log('🧹 Starting duplicate cleanup...\n');

  try {
    // First, let's see what duplicates we have
    const { data: allLeads, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching leads:', fetchError);
      return;
    }

    console.log(`Total leads in database: ${allLeads.length}`);

    // Group by phone number (primary duplicate indicator)
    const phoneGroups = {};
    allLeads.forEach(lead => {
      if (!phoneGroups[lead.phone]) {
        phoneGroups[lead.phone] = [];
      }
      phoneGroups[lead.phone].push(lead);
    });

    // Find duplicates
    const duplicateGroups = Object.entries(phoneGroups)
      .filter(([phone, leads]) => leads.length > 1);

    console.log(`Found ${duplicateGroups.length} phone numbers with duplicates\n`);

    let totalDeleted = 0;
    const deletionReport = [];

    // Process each duplicate group
    for (const [phone, leads] of duplicateGroups) {
      // Sort by created_at to keep the oldest
      leads.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      const keep = leads[0];
      const toDelete = leads.slice(1);

      console.log(`📱 Phone: ${phone}`);
      console.log(`   Name: ${keep.lead_name}`);
      console.log(`   Keeping: ${new Date(keep.created_at).toLocaleString('he-IL')} (oldest)`);
      console.log(`   Deleting: ${toDelete.length} duplicate(s)`);

      // Store info for report
      deletionReport.push({
        phone,
        name: keep.lead_name,
        kept_id: keep.id,
        kept_date: keep.created_at,
        deleted_count: toDelete.length,
        deleted_ids: toDelete.map(l => l.id)
      });

      // Delete duplicates
      const idsToDelete = toDelete.map(lead => lead.id);

      const { error: deleteError, count } = await supabase
        .from('leads')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error(`   ❌ Error deleting duplicates for ${phone}:`, deleteError);
      } else {
        console.log(`   ✅ Deleted ${toDelete.length} duplicate(s)`);
        totalDeleted += toDelete.length;
      }
      console.log('');
    }

    // Special check for מורן חסון
    console.log('\n--- Special Check: מורן חסון ---');
    const { data: moranLeads } = await supabase
      .from('leads')
      .select('*')
      .ilike('lead_name', '%מורן חסון%')
      .order('created_at', { ascending: true });

    if (moranLeads && moranLeads.length > 0) {
      console.log(`Found ${moranLeads.length} entries for מורן חסון after cleanup`);
      if (moranLeads.length === 1) {
        console.log('✅ Successfully reduced to single entry!');
      } else {
        console.log('⚠️ Still have multiple entries - may have different phone numbers');
        moranLeads.forEach((lead, i) => {
          console.log(`  ${i+1}. Phone: ${lead.phone}, Created: ${new Date(lead.created_at).toLocaleString('he-IL')}`);
        });
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 CLEANUP COMPLETE!');
    console.log('='.repeat(50));
    console.log(`Total duplicates deleted: ${totalDeleted}`);
    console.log(`Unique leads remaining: ${allLeads.length - totalDeleted}`);

    // Save detailed report
    if (deletionReport.length > 0) {
      const reportPath = `cleanup_report_${new Date().toISOString().split('T')[0]}.json`;
      console.log(`\nDetailed report saved to: ${reportPath}`);

      require('fs').writeFileSync(
        reportPath,
        JSON.stringify(deletionReport, null, 2)
      );
    }

    // Verify final state
    const { count: finalCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true });

    console.log(`\nFinal lead count in database: ${finalCount}`);

  } catch (error) {
    console.error('Cleanup script error:', error);
  }
}

// Safety confirmation
console.log('⚠️  WARNING: This will DELETE duplicate leads permanently!');
console.log('We will keep the OLDEST entry for each phone number.\n');
console.log('Starting in 3 seconds... Press Ctrl+C to cancel.\n');

setTimeout(() => {
  cleanupDuplicates();
}, 3000);