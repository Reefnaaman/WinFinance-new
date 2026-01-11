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

// Enhanced CSV parsing with better error handling
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

async function systemPreFlightCheck() {
  console.log('\n🔍 Running System Pre-Flight Checks...\n');

  const checks = {
    database: false,
    agents: false,
    tables: false,
    backup: false
  };

  try {
    // Check database connection
    console.log('   ✓ Checking database connection...');
    const { data: test, error } = await supabase
      .from('leads')
      .select('count', { count: 'exact', head: true });

    if (!error) {
      checks.database = true;
      console.log('   ✅ Database connection successful');
    } else {
      console.log('   ❌ Database connection failed:', error.message);
    }

    // Check agents table
    console.log('   ✓ Checking agents configuration...');
    const { data: agents, error: agentsError, count: agentCount } = await supabase
      .from('agents')
      .select('*', { count: 'exact' });

    if (!agentsError && agentCount > 0) {
      checks.agents = true;
      console.log(`   ✅ Found ${agentCount} agents configured`);

      // List agents
      console.log('   📋 Available agents:');
      agents.forEach(agent => {
        console.log(`      - ${agent.name} (${agent.role})`);
      });
    } else {
      console.log('   ❌ No agents found in system');
    }

    // Check table structure
    console.log('   ✓ Verifying table structure...');
    const { data: sampleLead } = await supabase
      .from('leads')
      .select('*')
      .limit(1);

    if (sampleLead) {
      checks.tables = true;
      console.log('   ✅ Lead table structure verified');
    }

    // Check backup capability
    console.log('   ✓ Testing backup capability...');
    const backupDir = path.join(__dirname, '..', 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const testFile = path.join(backupDir, '.test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    checks.backup = true;
    console.log('   ✅ Backup directory ready');

  } catch (error) {
    console.error('   ❌ Pre-flight check error:', error.message);
  }

  // Summary
  const allPassed = Object.values(checks).every(check => check === true);

  console.log('\n📊 Pre-Flight Check Summary:');
  console.log(`   Database Connection: ${checks.database ? '✅' : '❌'}`);
  console.log(`   Agents Configuration: ${checks.agents ? '✅' : '❌'}`);
  console.log(`   Table Structure: ${checks.tables ? '✅' : '❌'}`);
  console.log(`   Backup Capability: ${checks.backup ? '✅' : '❌'}`);

  if (!allPassed) {
    console.log('\n⚠️  Warning: Some checks failed. Migration may not work properly.');
    const proceed = await askQuestion('   Continue anyway? (yes/no): ');
    if (proceed.toLowerCase() !== 'yes') {
      return false;
    }
  } else {
    console.log('\n✅ All pre-flight checks passed!');
  }

  return true;
}

async function createBackup() {
  console.log('\n💾 Creating Backup...');

  const { data: leads, error, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' });

  if (error) {
    throw new Error(`Backup failed: ${error.message}`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');
  const backupFile = path.join(backupDir, `leads-backup-${timestamp}.json`);

  const backupData = {
    timestamp: new Date().toISOString(),
    count: count || 0,
    leads: leads || []
  };

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

  console.log(`   ✅ Backup created: ${backupFile}`);
  console.log(`   📊 Backed up ${count || 0} leads`);

  return backupFile;
}

async function validateAndPreviewCSV(csvPath) {
  console.log('\n📋 Validating and Previewing CSV...\n');

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header and one data row');
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, '').trim());
  console.log('   📊 CSV Structure:');
  console.log('   Columns found:', headers.join(', '));

  // Check required columns
  const required = ['lead_name', 'phone'];
  const missing = required.filter(col => !headers.includes(col));

  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }

  // Optional columns
  const optional = ['email', 'source', 'relevance_status', 'status', 'agent_notes', 'assigned_agent_id', 'meeting_date', 'price', 'scheduled_call_date'];
  const optionalFound = optional.filter(col => headers.includes(col));

  if (optionalFound.length > 0) {
    console.log('   Optional columns found:', optionalFound.join(', '));
  }

  // Parse and preview data
  const dataRows = lines.slice(1).filter(line => line.trim());
  console.log(`\n   📈 Data Summary:`);
  console.log(`   Total rows: ${dataRows.length}`);

  // Preview first 5 rows
  console.log('\n   👁️  Preview (first 5 rows):');
  console.log('   ' + '─'.repeat(60));

  for (let i = 0; i < Math.min(5, dataRows.length); i++) {
    const values = parseCSVLine(dataRows[i]);
    const data = {};

    headers.forEach((header, index) => {
      const value = values[index] || '';
      data[header] = value.replace(/^"|"$/g, '').trim() || null;
    });

    console.log(`   Row ${i + 1}:`);
    console.log(`      Name: ${data.lead_name}`);
    console.log(`      Phone: ${data.phone}`);
    if (data.email) console.log(`      Email: ${data.email}`);
    if (data.source) console.log(`      Source: ${data.source}`);
  }

  console.log('   ' + '─'.repeat(60));

  // Data validation
  const errors = [];
  const warnings = [];

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2;
    const values = parseCSVLine(dataRows[i]);
    const data = {};

    headers.forEach((header, index) => {
      data[header] = values[index]?.replace(/^"|"$/g, '').trim() || null;
    });

    // Check required fields
    if (!data.lead_name) {
      errors.push(`Row ${rowNum}: Missing lead_name`);
    }

    if (!data.phone) {
      errors.push(`Row ${rowNum}: Missing phone`);
    } else if (!/^[0-9-+()]+$/.test(data.phone.replace(/\s/g, ''))) {
      warnings.push(`Row ${rowNum}: Phone format may be invalid: ${data.phone}`);
    }

    // Check email format if provided
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      warnings.push(`Row ${rowNum}: Email format may be invalid: ${data.email}`);
    }
  }

  // Report validation results
  if (errors.length > 0) {
    console.log('\n   ❌ Validation Errors:');
    errors.slice(0, 5).forEach(err => console.log(`      - ${err}`));
    if (errors.length > 5) {
      console.log(`      ... and ${errors.length - 5} more errors`);
    }
  }

  if (warnings.length > 0) {
    console.log('\n   ⚠️  Warnings:');
    warnings.slice(0, 5).forEach(warn => console.log(`      - ${warn}`));
    if (warnings.length > 5) {
      console.log(`      ... and ${warnings.length - 5} more warnings`);
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n   ✅ All data validation checks passed!');
  }

  return {
    headers,
    dataRows,
    totalCount: dataRows.length,
    errors,
    warnings
  };
}

async function clearExistingLeads(backupFile) {
  console.log('\n🗑️  Clearing Existing Leads...');

  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  console.log(`   Found ${count || 0} existing leads`);

  if (count > 0) {
    console.log(`   ⚠️  This action will delete ${count} leads`);
    console.log(`   💾 Backup saved at: ${backupFile}`);

    const answer = await askQuestion('   Proceed with deletion? (yes/no): ');

    if (answer.toLowerCase() !== 'yes') {
      console.log('   ❌ Deletion cancelled');
      return false;
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      throw new Error(`Failed to delete leads: ${error.message}`);
    }

    console.log(`   ✅ Successfully deleted ${count} leads`);
  } else {
    console.log('   ℹ️  No existing leads to delete');
  }

  return true;
}

async function importLeads(csvPath, dryRun = false) {
  console.log(`\n📥 ${dryRun ? 'DRY RUN - ' : ''}Importing Leads...`);

  const { headers, dataRows } = await validateAndPreviewCSV(csvPath);

  const leads = [];
  let skipped = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const values = parseCSVLine(dataRows[i]);
    const data = {};

    headers.forEach((header, index) => {
      const value = values[index]?.replace(/^"|"$/g, '').trim() || '';
      data[header] = value === '' ? null : value;
    });

    // Skip if required fields missing
    if (!data.lead_name || !data.phone) {
      skipped++;
      continue;
    }

    // Build lead object
    const lead = {
      lead_name: data.lead_name,
      phone: data.phone,
      email: data.email || null,
      source: data.source || 'CSV Import',
      relevance_status: data.relevance_status || 'ממתין לבדיקה',
      status: data.status || 'לא תואם',
      agent_notes: data.agent_notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Optional fields
    if (data.assigned_agent_id) lead.assigned_agent_id = data.assigned_agent_id;
    if (data.meeting_date) lead.meeting_date = data.meeting_date;
    if (data.price) lead.price = parseFloat(data.price);
    if (data.scheduled_call_date) lead.scheduled_call_date = data.scheduled_call_date;

    leads.push(lead);
  }

  console.log(`   📊 Prepared ${leads.length} leads for import`);
  if (skipped > 0) {
    console.log(`   ⚠️  Skipped ${skipped} invalid rows`);
  }

  if (dryRun) {
    console.log('\n   🔍 DRY RUN COMPLETE - No data was imported');
    return { imported: 0, total: leads.length };
  }

  // Import in batches
  const batchSize = 100;
  let imported = 0;

  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);

    const { error } = await supabase
      .from('leads')
      .insert(batch);

    if (error) {
      console.error(`   ❌ Batch import error: ${error.message}`);
      throw error;
    }

    imported += batch.length;
    console.log(`   ✅ Imported ${imported}/${leads.length} leads...`);
  }

  return { imported, total: leads.length };
}

async function verifyImport() {
  console.log('\n🔍 Verifying Import...');

  const { data: leads, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .limit(5);

  console.log(`   Total leads in database: ${count}`);

  if (leads && leads.length > 0) {
    console.log('\n   Sample imported leads:');
    leads.forEach((lead, i) => {
      console.log(`   ${i + 1}. ${lead.lead_name} - ${lead.phone} (${lead.status})`);
    });
  }

  return count;
}

async function main() {
  console.log('🚀 Enhanced Lead Migration Tool');
  console.log('================================\n');

  try {
    // Run pre-flight checks
    const checksPass = await systemPreFlightCheck();
    if (!checksPass) {
      console.log('\n❌ Pre-flight checks failed. Exiting...');
      rl.close();
      return;
    }

    // Get CSV file path
    const csvPath = await askQuestion('\n📁 Enter the path to your CSV file: ');

    if (!csvPath) {
      console.log('❌ No file path provided');
      rl.close();
      return;
    }

    // Validate and preview CSV
    const validation = await validateAndPreviewCSV(csvPath.trim());

    if (validation.errors.length > 0) {
      console.log('\n❌ CSV has validation errors that must be fixed');
      const proceed = await askQuestion('Continue anyway? (yes/no): ');
      if (proceed.toLowerCase() !== 'yes') {
        rl.close();
        return;
      }
    }

    // Dry run option
    const dryRun = await askQuestion('\n🔍 Perform dry run first? (yes/no): ');

    if (dryRun.toLowerCase() === 'yes') {
      await importLeads(csvPath.trim(), true);

      const continueMigration = await askQuestion('\n   Continue with actual migration? (yes/no): ');
      if (continueMigration.toLowerCase() !== 'yes') {
        console.log('\n❌ Migration cancelled');
        rl.close();
        return;
      }
    }

    // Create backup
    const backupFile = await createBackup();

    // Final confirmation
    console.log('\n⚠️  FINAL CONFIRMATION');
    console.log('   This will:');
    console.log('   1. Delete all existing leads');
    console.log('   2. Import new leads from your CSV');
    console.log(`   3. Backup location: ${backupFile}`);

    const finalConfirm = await askQuestion('\n   Proceed with migration? (yes/no): ');

    if (finalConfirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Migration cancelled');
      rl.close();
      return;
    }

    // Execute migration
    const cleared = await clearExistingLeads(backupFile);

    if (cleared) {
      const { imported, total } = await importLeads(csvPath.trim(), false);

      if (imported > 0) {
        const finalCount = await verifyImport();

        console.log('\n✅ Migration Completed Successfully!');
        console.log('   ' + '═'.repeat(40));
        console.log(`   Total leads imported: ${finalCount}`);
        console.log(`   Success rate: ${((imported/total) * 100).toFixed(1)}%`);
        console.log(`   Backup saved: ${backupFile}`);
        console.log('   ' + '═'.repeat(40));

        // Rollback option
        console.log('\n💡 If you need to rollback, run:');
        console.log(`   node scripts/restore-backup.js "${backupFile}"`);
      }
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Check your CSV file and try again');
  } finally {
    rl.close();
  }
}

// Run the migration
main();