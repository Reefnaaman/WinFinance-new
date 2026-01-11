const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://evevxcynppowloshvtcy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2ZXZ4Y3lucHBvd2xvc2h2dGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTIxNzQ1MiwiZXhwIjoyMDgwNzkzNDUyfQ.vBg5aRj3O-MyfvqnQMHJu2tVFvKn_S1EpAhfYmgQ8lk'
);

async function checkSystem() {
  console.log('=== SYSTEM CHECK ===\n');

  // 1. Check email_logs table
  const { data: logs, error: logsError } = await supabase
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('📧 RECENT EMAIL LOGS:');
  if (logs && logs.length > 0) {
    logs.forEach(log => {
      console.log(`  - ${new Date(log.created_at).toLocaleString()}: ${log.email_subject || 'No subject'}`);
      if (log.raw_content && log.raw_content.includes('Push Notification')) {
        console.log('    ✅ This was from a PUSH notification!');
      }
    });
  } else {
    console.log('  ❌ No email logs found - webhook is NOT receiving notifications');
  }

  // 2. Check recent leads
  console.log('\n📋 RECENT LEADS:');
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (leads && leads.length > 0) {
    leads.forEach(lead => {
      console.log(`  - ${new Date(lead.created_at).toLocaleString()}: ${lead.lead_name} (${lead.phone})`);
    });
  } else {
    console.log('  No recent leads');
  }

  // 3. Check Gmail watch status
  console.log('\n⏰ GMAIL WATCH STATUS:');
  const { data: watch } = await supabase
    .from('gmail_watch')
    .select('*')
    .single();

  if (watch) {
    const expiry = new Date(watch.expiration);
    const now = new Date();
    if (expiry > now) {
      console.log(`  ✅ Watch ACTIVE until ${expiry.toLocaleString()}`);
    } else {
      console.log(`  ❌ Watch EXPIRED on ${expiry.toLocaleString()}`);
    }
  } else {
    console.log('  ❌ No watch data found');
  }

  console.log('\n=== DIAGNOSIS ===');
  if (!logs || logs.length === 0) {
    console.log('🔴 PROBLEM: Webhook is NOT receiving notifications from Gmail');
    console.log('   FIX: Check Pub/Sub subscription URL in Google Cloud Console');
  } else if (logs[0].raw_content && !logs[0].raw_content.includes('Push Notification')) {
    console.log('🟡 Emails are being checked but NOT via push notifications');
    console.log('   FIX: Verify Pub/Sub subscription is active');
  } else {
    console.log('🟢 System appears to be working');
  }
}

checkSystem().catch(console.error);