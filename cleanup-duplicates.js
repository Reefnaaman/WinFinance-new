const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupDuplicates() {
  try {
    // Get all איתן מלאני leads
    const { data: duplicates, error } = await supabase
      .from('leads')
      .select('*')
      .eq('lead_name', 'איתן מלאני')
      .order('created_at', { ascending: true }); // Keep the oldest one

    if (error) {
      console.error('Error fetching duplicates:', error);
      return;
    }

    if (duplicates.length <= 1) {
      console.log('No duplicates to clean up.');
      return;
    }

    console.log(`Found ${duplicates.length} duplicate entries for "איתן מלאני"`);

    // Keep the first (oldest) entry, delete the rest
    const toKeep = duplicates[0];
    const toDelete = duplicates.slice(1);

    console.log(`Keeping entry from ${new Date(toKeep.created_at).toLocaleString('he-IL')}`);
    console.log(`Deleting ${toDelete.length} duplicate entries...`);

    // Delete the duplicates
    const idsToDelete = toDelete.map(lead => lead.id);

    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Error deleting duplicates:', deleteError);
      return;
    }

    console.log(`Successfully deleted ${idsToDelete.length} duplicate entries.`);
    console.log(`Kept original entry: "${toKeep.lead_name}" (${toKeep.phone}) created ${new Date(toKeep.created_at).toLocaleString('he-IL')}`);

  } catch (error) {
    console.error('Script error:', error);
  }
}

// Ask for confirmation first
console.log('This will delete duplicate "איתן מלאני" entries, keeping only the oldest one.');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...');

setTimeout(() => {
  cleanupDuplicates();
}, 5000);