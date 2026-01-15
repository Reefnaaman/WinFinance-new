const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function restoreFromBackup(backupFile) {
  console.log('\n📦 Restore from Backup Tool');
  console.log('===========================\n');

  try {
    // Check if backup file exists
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    // Read backup file
    console.log('📖 Reading backup file...');
    const backupContent = fs.readFileSync(backupFile, 'utf-8');
    const backupData = JSON.parse(backupContent);

    console.log(`   Backup created: ${backupData.timestamp}`);
    console.log(`   Contains ${backupData.count} leads`);

    // Check current database state
    const { count: currentCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Current database has ${currentCount || 0} leads`);

    // Confirm restoration
    console.log('\n⚠️  WARNING:');
    console.log('   This will:');
    console.log(`   1. Delete all ${currentCount || 0} current leads`);
    console.log(`   2. Restore ${backupData.count} leads from backup`);
    console.log(`   3. Cannot be undone without another backup`);

    const confirm = await askQuestion('\n   Proceed with restore? (yes/no): ');

    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Restore cancelled');
      return;
    }

    // Clear current leads
    console.log('\n🗑️  Clearing current leads...');
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      throw new Error(`Failed to delete current leads: ${deleteError.message}`);
    }

    console.log(`   ✅ Cleared ${currentCount || 0} leads`);

    // Restore from backup
    console.log('\n📥 Restoring from backup...');

    const batchSize = 100;
    let restored = 0;
    const leads = backupData.leads || [];

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);

      const { error: insertError } = await supabase
        .from('leads')
        .insert(batch);

      if (insertError) {
        console.error(`   ❌ Restore error: ${insertError.message}`);
        throw insertError;
      }

      restored += batch.length;
      console.log(`   ✅ Restored ${restored}/${leads.length} leads...`);
    }

    // Verify restoration
    console.log('\n🔍 Verifying restoration...');
    const { data: verifyLeads, count: finalCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .limit(5);

    console.log(`   Total leads restored: ${finalCount}`);

    if (verifyLeads && verifyLeads.length > 0) {
      console.log('\n   Sample restored leads:');
      verifyLeads.forEach((lead, i) => {
        console.log(`   ${i + 1}. ${lead.lead_name} - ${lead.phone}`);
      });
    }

    console.log('\n✅ Restoration completed successfully!');
    console.log(`   Restored ${finalCount} leads from backup`);

  } catch (error) {
    console.error('\n❌ Restore failed:', error.message);
  } finally {
    rl.close();
  }
}

// Main execution
async function main() {
  const backupFile = process.argv[2];

  if (!backupFile) {
    console.log('📦 Restore from Backup Tool');
    console.log('===========================\n');
    console.log('Usage: node scripts/restore-backup.js <backup-file-path>');
    console.log('\nExample:');
    console.log('  node scripts/restore-backup.js backups/leads-backup-2024-01-09.json');

    // List available backups
    const backupDir = path.join(__dirname, '..', 'backups');
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('leads-backup-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length > 0) {
        console.log('\n📁 Available backups:');
        files.forEach(file => {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          const size = (stats.size / 1024).toFixed(2);
          console.log(`   - ${file} (${size} KB)`);
        });
      }
    }

    process.exit(0);
  }

  await restoreFromBackup(backupFile);
}

main();