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

// Create readline interface for user confirmation
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

async function validateCSV(csvPath) {
  console.log('\n📋 Validating CSV file...');

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  console.log('   Found columns:', headers.join(', '));

  // Required columns
  const required = ['lead_name', 'phone'];
  const missing = required.filter(col => !headers.includes(col));

  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }

  const dataRows = lines.slice(1).filter(line => line.trim());
  console.log(`   Found ${dataRows.length} data rows`);

  return {
    headers,
    dataRows,
    totalCount: dataRows.length
  };
}

async function clearExistingLeads() {
  console.log('\n🗑️  Clearing existing leads...');

  // First, get count
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  console.log(`   Found ${count || 0} existing leads`);

  if (count > 0) {
    const answer = await askQuestion(`   ⚠️  Are you sure you want to delete ${count} existing leads? (yes/no): `);

    if (answer.toLowerCase() !== 'yes') {
      console.log('   ❌ Migration cancelled by user');
      return false;
    }

    // Delete all leads
    const { error } = await supabase
      .from('leads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible ID)

    if (error) {
      throw new Error(`Failed to delete leads: ${error.message}`);
    }

    console.log(`   ✅ Successfully deleted ${count} leads`);
  } else {
    console.log('   ℹ️  No existing leads to delete');
  }

  return true;
}

function parseCSVRow(row, headers) {
  const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, '')); // Remove quotes
  const obj = {};

  headers.forEach((header, index) => {
    const value = values[index] || '';
    obj[header] = value === '' ? null : value;
  });

  return obj;
}

async function importLeads(csvPath) {
  console.log('\n📥 Importing new leads...');

  const { headers, dataRows, totalCount } = await validateCSV(csvPath);

  const leads = [];
  const errors = [];

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2; // Account for header row
    const row = dataRows[i];

    try {
      const data = parseCSVRow(row, headers);

      // Validate required fields
      if (!data.lead_name || !data.phone) {
        errors.push(`Row ${rowNum}: Missing required fields (lead_name or phone)`);
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
    } catch (error) {
      errors.push(`Row ${rowNum}: ${error.message}`);
    }
  }

  console.log(`\n   📊 Parsed ${leads.length} valid leads from ${totalCount} rows`);

  if (errors.length > 0) {
    console.log('\n   ⚠️  Errors found:');
    errors.slice(0, 10).forEach(err => console.log(`      - ${err}`));
    if (errors.length > 10) {
      console.log(`      ... and ${errors.length - 10} more errors`);
    }

    const answer = await askQuestion('\n   Continue with import? (yes/no): ');
    if (answer.toLowerCase() !== 'yes') {
      console.log('   ❌ Import cancelled');
      return false;
    }
  }

  // Import in batches
  const batchSize = 100;
  let imported = 0;

  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('leads')
      .insert(batch);

    if (error) {
      console.error(`   ❌ Batch import error: ${error.message}`);
      throw error;
    }

    imported += batch.length;
    console.log(`   ✅ Imported ${imported}/${leads.length} leads...`);
  }

  console.log(`\n   🎉 Successfully imported ${imported} leads!`);
  return true;
}

async function verifyImport() {
  console.log('\n🔍 Verifying import...');

  const { data: leads, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: false })
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
  console.log('🚀 Safe Lead Migration Tool');
  console.log('============================\n');

  try {
    // Ask for CSV file path
    const csvPath = await askQuestion('📁 Enter the path to your CSV file: ');

    if (!csvPath) {
      console.log('❌ No file path provided');
      rl.close();
      return;
    }

    // Validate CSV
    await validateCSV(csvPath.trim());

    console.log('\n⚠️  WARNING: This will:');
    console.log('   1. Delete all existing leads (after confirmation)');
    console.log('   2. Import new leads from your CSV file');
    console.log('   3. Verify the import was successful\n');

    const proceed = await askQuestion('Do you want to proceed? (yes/no): ');

    if (proceed.toLowerCase() !== 'yes') {
      console.log('\n❌ Migration cancelled');
      rl.close();
      return;
    }

    // Execute migration
    const cleared = await clearExistingLeads();

    if (cleared) {
      const imported = await importLeads(csvPath.trim());

      if (imported) {
        const finalCount = await verifyImport();

        console.log('\n✅ Migration completed successfully!');
        console.log(`   Final lead count: ${finalCount}`);
      }
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Tip: Check your CSV file format and try again');
  } finally {
    rl.close();
  }
}

// Run the migration
main();