const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    console.log('🔧 Creating processed_emails table...');

    // Create the table
    const { data: tableResult, error: tableError } = await supabase.rpc('exec', {
      query: `
        CREATE TABLE IF NOT EXISTS processed_emails (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          gmail_message_id TEXT UNIQUE NOT NULL,
          lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
          processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          processed_by TEXT NOT NULL,
          email_from TEXT,
          email_subject TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (tableError) {
      console.log('Table might already exist, trying direct SQL...');

      // Try using direct SQL via query
      const { error: directError } = await supabase
        .from('processed_emails')
        .select('id')
        .limit(1);

      if (directError && directError.code === 'PGRST116') {
        console.error('❌ Cannot create table. Please run this SQL manually in Supabase:');
        console.log(`
CREATE TABLE IF NOT EXISTS processed_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gmail_message_id TEXT UNIQUE NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_by TEXT NOT NULL,
    email_from TEXT,
    email_subject TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_emails_gmail_message_id ON processed_emails(gmail_message_id);
        `);
        return;
      } else {
        console.log('✅ Table already exists or was created successfully');
      }
    } else {
      console.log('✅ Table created successfully');
    }

    // Test that the table works
    const { data: testData, error: testError } = await supabase
      .from('processed_emails')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Table test failed:', testError);
    } else {
      console.log('✅ Table is accessible and ready for use');
    }

  } catch (error) {
    console.error('❌ Migration script error:', error);
  }
}

runMigration();