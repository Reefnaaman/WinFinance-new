const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDuplicatePrevention() {
  console.log('🧪 Testing Duplicate Prevention System\n');

  // Test data
  const testLead = {
    lead_name: 'בדיקת כפילויות טסט',
    phone: '0501234567',
    email: 'test@example.com'
  };

  console.log('1️⃣ Testing webhook endpoint...');
  try {
    const response1 = await fetch('http://localhost:3000/api/webhooks/lead-created', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': 'WinFinance2025!'
      },
      body: JSON.stringify(testLead)
    });

    const result1 = await response1.json();

    if (response1.ok && result1.success) {
      console.log('✅ First lead created successfully');
      console.log(`   Lead ID: ${result1.lead?.id}`);
    } else {
      console.log('❌ Failed to create first lead:', result1.error);
    }

    // Try to create duplicate
    console.log('\n2️⃣ Attempting to create duplicate via webhook...');
    const response2 = await fetch('http://localhost:3000/api/webhooks/lead-created', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': 'WinFinance2025!'
      },
      body: JSON.stringify(testLead)
    });

    const result2 = await response2.json();

    if (response2.status === 409 && result2.duplicate) {
      console.log('✅ Duplicate correctly prevented!');
      console.log(`   Reason: ${result2.reason}`);
      console.log(`   Message: ${result2.message}`);
    } else {
      console.log('❌ DUPLICATE NOT PREVENTED - THIS IS A BUG!');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }

  console.log('\n3️⃣ Testing manual lead creation API...');
  try {
    const testLead2 = {
      lead_name: 'בדיקה ידנית',
      phone: '0509876543',
      source: 'manual'
    };

    const response3 = await fetch('http://localhost:3000/api/leads/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testLead2)
    });

    const result3 = await response3.json();

    if (response3.ok && result3.success) {
      console.log('✅ Manual lead created successfully');
    }

    // Try duplicate
    const response4 = await fetch('http://localhost:3000/api/leads/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testLead2)
    });

    const result4 = await response4.json();

    if (response4.status === 409 && result4.duplicate) {
      console.log('✅ Manual duplicate correctly prevented!');
      console.log(`   Message: ${result4.message}`);
    } else {
      console.log('❌ MANUAL DUPLICATE NOT PREVENTED!');
    }

  } catch (error) {
    console.error('Manual test failed:', error.message);
  }

  // Clean up test data
  console.log('\n4️⃣ Cleaning up test data...');
  const { error: deleteError } = await supabase
    .from('leads')
    .delete()
    .or('lead_name.ilike.%בדיקת כפילויות%,lead_name.ilike.%בדיקה ידנית%');

  if (!deleteError) {
    console.log('✅ Test data cleaned up');
  }

  console.log('\n✨ Test complete!');
}

// Run test if server is running
console.log('Make sure your Next.js dev server is running (npm run dev)');
console.log('Starting test in 3 seconds...\n');

setTimeout(testDuplicatePrevention, 3000);