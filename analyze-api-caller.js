const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeAPICaller() {
  console.log('🔍 Analyzing who is calling /api/check-gmail\n');

  // Get recent API caller tracking logs
  const { data: callerLogs, error } = await supabase
    .from('email_logs')
    .select('*')
    .eq('email_from', 'API_CALLER_TRACKING')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  if (!callerLogs || callerLogs.length === 0) {
    console.log('No API caller tracking logs found yet.');
    console.log('Deploy the updated code and wait for the next 15-minute call.');
    return;
  }

  console.log(`Found ${callerLogs.length} API caller logs:\n`);

  // Analyze patterns
  const callers = new Map();

  callerLogs.forEach((log, index) => {
    console.log(`📍 Call #${index + 1} at ${new Date(log.created_at).toLocaleString('he-IL')}`);

    if (log.raw_content) {
      try {
        const caller = JSON.parse(log.raw_content);
        console.log(`   IP: ${caller.ip}`);
        console.log(`   User-Agent: ${caller.userAgent}`);
        console.log(`   Referer: ${caller.referer}`);
        console.log(`   Origin: ${caller.origin}`);
        console.log(`   Host: ${caller.host}`);
        console.log('');

        // Track unique callers
        const key = `${caller.ip}-${caller.userAgent}`;
        callers.set(key, (callers.get(key) || 0) + 1);
      } catch (e) {
        console.log('   Could not parse caller data');
      }
    }
  });

  // Show summary
  console.log('\n📊 SUMMARY OF CALLERS:');
  console.log('=' .repeat(50));

  for (const [key, count] of callers.entries()) {
    const [ip, agent] = key.split('-');
    console.log(`\n🔸 ${count} calls from:`);
    console.log(`   IP: ${ip}`);
    console.log(`   Agent: ${agent.substring(0, 100)}...`);
  }

  // Identify the source
  console.log('\n\n💡 POSSIBLE SOURCES:');
  console.log('=' .repeat(50));

  callerLogs.forEach(log => {
    if (log.raw_content) {
      try {
        const caller = JSON.parse(log.raw_content);

        // Check for known monitoring services
        if (caller.userAgent?.includes('UptimeRobot')) {
          console.log('⚠️ UptimeRobot monitoring service detected!');
        } else if (caller.userAgent?.includes('Pingdom')) {
          console.log('⚠️ Pingdom monitoring service detected!');
        } else if (caller.userAgent?.includes('StatusCake')) {
          console.log('⚠️ StatusCake monitoring service detected!');
        } else if (caller.ip?.includes('127.0.0.1') || caller.ip?.includes('localhost')) {
          console.log('📍 Local/Internal call (from your own server)');
        } else if (caller.origin?.includes('vercel')) {
          console.log('📍 Vercel internal call');
        } else if (caller.userAgent?.includes('Google')) {
          console.log('📍 Google service call');
        } else if (!caller.userAgent || caller.userAgent === 'unknown') {
          console.log('🤖 Automated script or cron job (no user agent)');
        }
      } catch (e) {}
    }
  });

  console.log('\n\n✅ NEXT STEPS:');
  console.log('1. Deploy the updated code to Vercel');
  console.log('2. Wait 15-30 minutes for the next call');
  console.log('3. Run this script again to see who called');
  console.log('4. Check Vercel Function Logs for more details');
}

analyzeAPICaller();