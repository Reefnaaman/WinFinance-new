const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupNatanelDuplicates() {
  console.log('🧹 Starting cleanup for נתנאל איפרגן duplicates...\n');

  try {
    // Get all נתנאל איפרגן entries
    const { data: allNatanel, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .ilike('lead_name', '%נתנאל איפרגן%')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching leads:', fetchError);
      return;
    }

    console.log(`Found ${allNatanel.length} entries for נתנאל איפרגן`);

    if (allNatanel.length <= 1) {
      console.log('✅ No duplicates found - nothing to clean!');
      return;
    }

    // Keep the first (oldest) one
    const toKeep = allNatanel[0];
    const toDelete = allNatanel.slice(1);

    console.log(`\n📱 Phone: ${toKeep.phone}`);
    console.log(`   Keeping: ${new Date(toKeep.created_at).toLocaleString('he-IL')} (oldest)`);
    console.log(`   ID: ${toKeep.id}`);
    console.log(`   Deleting: ${toDelete.length} duplicate(s)`);

    // Delete duplicates
    const idsToDelete = toDelete.map(lead => lead.id);

    const { error: deleteError, count } = await supabase
      .from('leads')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error(`❌ Error deleting duplicates:`, deleteError);
    } else {
      console.log(`✅ Successfully deleted ${toDelete.length} duplicates!`);
    }

    // Verify final count
    const { count: finalCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .ilike('lead_name', '%נתנאל איפרגן%');

    console.log(`\nFinal count for נתנאל איפרגן: ${finalCount}`);

    // Save cleanup report
    const report = {
      name: 'נתנאל איפרגן',
      phone: toKeep.phone,
      kept_id: toKeep.id,
      kept_date: toKeep.created_at,
      deleted_count: toDelete.length,
      deleted_ids: idsToDelete,
      cleanup_date: new Date().toISOString()
    };

    const reportPath = `natanel_cleanup_${new Date().toISOString().split('T')[0]}.json`;
    require('fs').writeFileSync(
      reportPath,
      JSON.stringify(report, null, 2)
    );

    console.log(`\nDetailed report saved to: ${reportPath}`);
    console.log('\n🎉 CLEANUP COMPLETE!');

  } catch (error) {
    console.error('Cleanup script error:', error);
  }
}

// Run immediately
cleanupNatanelDuplicates();