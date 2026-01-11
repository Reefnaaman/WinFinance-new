const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
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

// Map agent names to IDs from database
const agentMapping = {
  'עדי בראל': 'adi',
  'עדי': 'adi',
  'יקיר': 'yakir',
  'לפלג': 'peleg',
  'פלג': 'peleg',
  'דור': 'dor',
  'אידן': 'idan',
  'אוריאל': 'oriel'
};

// Map status from Excel to our system
// Valid database values: 'ליד חדש' | 'תואם' | 'אין מענה - לתאם מחדש' | 'התקיימה - כשלון' | 'במעקב' | 'עסקה נסגרה' | 'לא רלוונטי'
function mapStatus(excelStatus) {
  if (!excelStatus) return 'ליד חדש';

  const status = excelStatus.toLowerCase();

  if (status.includes('נסגר') || status.includes('נמכר')) {
    return 'עסקה נסגרה';
  } else if (status.includes('תואם') || status.includes('התקיים')) {
    return 'תואם';
  } else if (status.includes('לא מעוניין') || status.includes('לא רצה')) {
    return 'התקיימה - כשלון';
  } else if (status.includes('לא רלוונטי')) {
    return 'לא רלוונטי';
  } else if (status.includes('במעקב')) {
    return 'במעקב';
  } else if (status.includes('אין מענה')) {
    return 'אין מענה - לתאם מחדש';
  }

  return 'ליד חדש';
}

async function migrateExcelLeads() {
  console.log('🚀 Excel Lead Migration Tool');
  console.log('============================\n');

  try {
    // Read Excel file
    const excelPath = '/Users/reefnaaman/Downloads/גיליון ללא שם.xlsx';
    console.log('📖 Reading Excel file...');

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip header row
    const rows = data.slice(1).filter(row => row.some(cell => cell));
    console.log(`   Found ${rows.length} leads in Excel\n`);

    // Parse leads with YOUR specific column structure
    const leads = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      // ACTUAL Excel structure:
      // [0] = נייד (phone number)
      // [1] = empty
      // [2] = סטאטוס
      // [3] = תאריך פגישה
      // [4] = empty
      // [5] = שם לקוח
      // [6] = סוכן מטפל
      // [7] = additional notes/colors

      const leadName = row[5];
      const phone = row[0];  // Phone is in column 0!
      const status = row[2];
      const meetingNotes = row[3];
      const agentName = row[6];

      // Skip if no name
      if (!leadName) {
        continue;
      }

      // Clean phone number (remove non-digits, add 0 if needed)
      let cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';
      if (cleanPhone && !cleanPhone.startsWith('0')) {
        cleanPhone = '0' + cleanPhone;
      }

      // If no phone, generate placeholder
      if (!cleanPhone) {
        cleanPhone = `000-NOPHONE-${rowNum}`;
        errors.push(`Row ${rowNum}: ${leadName} - No phone number`);
      }

      // Skip agent mapping for now - would need actual UUIDs from database
      let assignedAgent = null;

      const lead = {
        lead_name: leadName.trim(),
        phone: cleanPhone,
        email: null,
        source: 'Excel Import',
        relevance_status: status ? 'רלוונטי' : 'ממתין לבדיקה',
        status: mapStatus(status),
        agent_notes: status || null,
        meeting_date: null, // Can be parsed later if needed
        assigned_agent_id: assignedAgent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      leads.push(lead);
    }

    console.log('📊 Migration Summary:');
    console.log(`   Total leads to import: ${leads.length}`);
    if (errors.length > 0) {
      console.log(`   ⚠️  Leads without phone: ${errors.length}`);
    }

    // Show sample
    console.log('\n👁️  Sample leads (first 3):');
    for (let i = 0; i < Math.min(3, leads.length); i++) {
      const lead = leads[i];
      console.log(`   ${i + 1}. ${lead.lead_name} - ${lead.phone} (${lead.status})`);
    }

    // Get current count
    const { count: currentCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    console.log(`\n⚠️  This will:`);
    console.log(`   1. Delete ${currentCount} existing leads`);
    console.log(`   2. Import ${leads.length} new leads from Excel`);

    // Auto-confirm for now - remove this for production
    const autoConfirm = true;

    if (!autoConfirm) {
      const confirm = await askQuestion('\n   Proceed with migration? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes') {
        console.log('❌ Migration cancelled');
        rl.close();
        return;
      }
    } else {
      console.log('\n   ⚡ Auto-confirming migration...');
    }

    // Clear existing leads
    console.log('\n🗑️  Clearing existing leads...');
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      throw new Error(`Failed to delete: ${deleteError.message}`);
    }

    // Import new leads in batches
    console.log('\n📥 Importing new leads...');
    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);

      const { error: insertError } = await supabase
        .from('leads')
        .insert(batch);

      if (insertError) {
        console.error(`❌ Import error: ${insertError.message}`);
        throw insertError;
      }

      imported += batch.length;
      console.log(`   ✅ Imported ${imported}/${leads.length} leads...`);
    }

    // Verify
    const { count: finalCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    console.log('\n✅ Migration Complete!');
    console.log(`   Successfully imported ${finalCount} leads`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
  } finally {
    rl.close();
  }
}

// Run migration
migrateExcelLeads();