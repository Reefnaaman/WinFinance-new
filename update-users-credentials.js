const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://evevxcynppowloshvtcy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2ZXZ4Y3lucHBvd2xvc2h2dGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTIxNzQ1MiwiZXhwIjoyMDgwNzkzNDUyfQ.vBg5aRj3O-MyfvqnQMHJu2tVFvKn_S1EpAhfYmgQ8lk'
);

// Generate strong random password
function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function updateUserCredentials() {
  console.log('🔄 Starting user credentials update...\n');

  try {
    // 1. Get all current users from agents table
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .ilike('email', '%@winfinance.com');

    if (agentsError) {
      console.error('❌ Error fetching agents:', agentsError);
      return;
    }

    console.log(`📋 Found ${agents.length} users with @winfinance.com emails\n`);

    const newCredentials = [];

    // 2. Process each user
    for (const agent of agents) {
      const oldEmail = agent.email;
      const newEmail = oldEmail.replace('@winfinance.com', '@winfinance.co.il');
      const newPassword = generateRandomPassword();

      console.log(`👤 Processing: ${agent.name} (${oldEmail})`);

      try {
        // 3. Get the auth user by old email
        const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          console.error(`  ❌ Error listing auth users: ${listError.message}`);
          continue;
        }

        const authUser = authUsers.users.find(u => u.email === oldEmail);
        if (!authUser) {
          console.log(`  ⚠️  No auth user found for ${oldEmail}, skipping...`);
          continue;
        }

        // 4. Update the auth user's email and password
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          authUser.id,
          {
            email: newEmail,
            password: newPassword,
            email_confirm: true
          }
        );

        if (updateError) {
          console.error(`  ❌ Error updating auth user: ${updateError.message}`);
          continue;
        }

        console.log(`  ✅ Auth user updated successfully`);

        // 5. Update the agents table
        const { error: agentUpdateError } = await supabase
          .from('agents')
          .update({ email: newEmail })
          .eq('id', agent.id);

        if (agentUpdateError) {
          console.error(`  ❌ Error updating agent table: ${agentUpdateError.message}`);
          continue;
        }

        console.log(`  ✅ Agents table updated successfully`);

        // Store the new credentials
        newCredentials.push({
          name: agent.name,
          role: agent.role,
          oldEmail,
          newEmail,
          newPassword
        });

        console.log(`  ✅ ${agent.name} updated successfully\n`);

      } catch (error) {
        console.error(`  ❌ Error processing ${agent.name}: ${error.message}\n`);
      }
    }

    // 6. Display all new credentials
    console.log('\n🎉 UPDATE COMPLETE!\n');
    console.log('📝 NEW USER CREDENTIALS:');
    console.log('=' .repeat(80));

    newCredentials.forEach(cred => {
      console.log(`👤 ${cred.name} (${cred.role})`);
      console.log(`   Email: ${cred.newEmail}`);
      console.log(`   Password: ${cred.newPassword}`);
      console.log('   ---');
    });

    console.log('=' .repeat(80));
    console.log(`✅ Successfully updated ${newCredentials.length} users`);
    console.log('⚠️  IMPORTANT: Save these credentials securely!');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

updateUserCredentials();