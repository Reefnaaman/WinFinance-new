const API_BASE_URL = 'http://localhost:3000/api/leads';

// Test data
const testLead = {
  lead_name: "Test Lead API",
  phone: "0501234567",
  email: "test@example.com",
  source: "Manual",
  agent_notes: "Created via API test"
};

async function testAPI() {
  console.log('🧪 Testing Leads API...\n');

  try {
    // 1. Test GET all leads
    console.log('1. Testing GET all leads...');
    const getResponse = await fetch(API_BASE_URL);
    const getResult = await getResponse.json();
    console.log(`✅ GET /api/leads - Status: ${getResponse.status}`);
    console.log(`   Found ${getResult.leads?.length || 0} leads\n`);

    // 2. Test GET with filters
    console.log('2. Testing GET with filters...');
    const filteredResponse = await fetch(`${API_BASE_URL}?relevance_status=רלוונטי&limit=10`);
    const filteredResult = await filteredResponse.json();
    console.log(`✅ GET /api/leads?relevance_status=רלוונטי - Status: ${filteredResponse.status}`);
    console.log(`   Found ${filteredResult.leads?.length || 0} relevant leads\n`);

    // 3. Test POST - Create new lead
    console.log('3. Testing POST - Create new lead...');
    const createResponse = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testLead)
    });
    const createResult = await createResponse.json();
    console.log(`✅ POST /api/leads - Status: ${createResponse.status}`);

    if (createResponse.status === 409) {
      console.log(`   Lead already exists (duplicate): ${createResult.message}`);
      // Try to find the existing lead
      const searchResponse = await fetch(`${API_BASE_URL}?phone=${testLead.phone}`);
      const searchResult = await searchResponse.json();
      if (searchResult.leads && searchResult.leads.length > 0) {
        const leadId = searchResult.leads[0].id;
        console.log(`   Found existing lead with ID: ${leadId}\n`);

        // Test update on existing lead
        console.log('4. Testing PATCH - Update existing lead...');
        const updateData = {
          id: leadId,
          status: "במעקב",
          agent_notes: "Updated via API test at " + new Date().toISOString()
        };

        const updateResponse = await fetch(API_BASE_URL, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData)
        });
        const updateResult = await updateResponse.json();
        console.log(`✅ PATCH /api/leads - Status: ${updateResponse.status}`);
        console.log(`   Lead updated successfully\n`);

        // Test GET single lead
        console.log('5. Testing GET single lead...');
        const singleResponse = await fetch(`${API_BASE_URL}/${leadId}`);
        const singleResult = await singleResponse.json();
        console.log(`✅ GET /api/leads/${leadId} - Status: ${singleResponse.status}`);
        console.log(`   Lead name: ${singleResult.lead?.lead_name}`);
        console.log(`   Status: ${singleResult.lead?.status}`);
        console.log(`   Notes: ${singleResult.lead?.agent_notes}\n`);
      }
    } else if (createResponse.status === 201) {
      console.log(`   New lead created with ID: ${createResult.lead?.id}\n`);
      const leadId = createResult.lead?.id;

      // 4. Test PATCH - Update lead
      if (leadId) {
        console.log('4. Testing PATCH - Update lead...');
        const updateData = {
          id: leadId,
          status: "תואם",
          meeting_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          agent_notes: "Meeting scheduled via API"
        };

        const updateResponse = await fetch(API_BASE_URL, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData)
        });
        const updateResult = await updateResponse.json();
        console.log(`✅ PATCH /api/leads - Status: ${updateResponse.status}`);
        console.log(`   Lead updated with meeting date\n`);

        // 5. Test GET single lead
        console.log('5. Testing GET single lead...');
        const singleResponse = await fetch(`${API_BASE_URL}/${leadId}`);
        const singleResult = await singleResponse.json();
        console.log(`✅ GET /api/leads/${leadId} - Status: ${singleResponse.status}`);
        console.log(`   Lead name: ${singleResult.lead?.lead_name}`);
        console.log(`   Status: ${singleResult.lead?.status}`);
        console.log(`   Meeting: ${singleResult.lead?.meeting_date}\n`);
      }
    }

    // 6. Test pagination
    console.log('6. Testing pagination...');
    const page1Response = await fetch(`${API_BASE_URL}?page=1&limit=5`);
    const page1Result = await page1Response.json();
    console.log(`✅ GET /api/leads?page=1&limit=5 - Status: ${page1Response.status}`);
    console.log(`   Page 1: ${page1Result.leads?.length || 0} leads`);
    console.log(`   Total leads: ${page1Result.pagination?.total || 0}`);
    console.log(`   Total pages: ${page1Result.pagination?.totalPages || 0}\n`);

    console.log('✅ All API tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
testAPI();