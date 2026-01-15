const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetPassword() {
  try {
    // First, find the user by email containing 'dvir'
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .ilike('email', '%dvir%');

    if (agentError) {
      console.error('Error finding agent:', agentError);
      return;
    }

    if (!agents || agents.length === 0) {
      // Try searching by name
      const { data: agentsByName, error: nameError } = await supabase
        .from('agents')
        .select('*')
        .ilike('name', '%dvir%');

      if (nameError) {
        console.error('Error finding agent by name:', nameError);
        return;
      }

      if (!agentsByName || agentsByName.length === 0) {
        console.log('No agent found with name or email containing "dvir"');
        return;
      }

      agents.push(...agentsByName);
    }

    console.log('Found agent(s):', agents.map(a => ({ name: a.name, email: a.email })));

    // Reset password for the first Dvir user found
    const targetAgent = agents[0];
    const newPassword = 'Dvir2025!';

    // Get the user from Supabase Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    // Find user with case-insensitive email match
    const authUser = users.find(u => u.email.toLowerCase() === targetAgent.email.toLowerCase());

    if (!authUser) {
      console.log(`No auth user found for ${targetAgent.email}`);
      console.log('Creating new auth user...');

      // Create the user with the new password
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: targetAgent.email,
        password: newPassword,
        email_confirm: true
      });

      if (createError) {
        if (createError.code === 'email_exists') {
          console.error('User already exists. Trying to find with case-insensitive search...');
          // Try to find the user with different case
          const existingUser = users.find(u => u.email.toLowerCase() === targetAgent.email.toLowerCase());
          if (existingUser) {
            const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
              existingUser.id,
              { password: newPassword }
            );

            if (updateError) {
              console.error('Error updating password:', updateError);
              return;
            }

            console.log(`✅ Password reset successful for ${targetAgent.name}`);
            console.log(`📧 Email: ${existingUser.email} (auth) / ${targetAgent.email} (database)`);
            console.log(`🔑 New Password: ${newPassword}`);
            return;
          }
        }
        console.error('Error creating user:', createError);
        return;
      }

      console.log(`✅ Created new user for ${targetAgent.name} (${targetAgent.email})`);
      console.log(`📧 Email: ${targetAgent.email}`);
      console.log(`🔑 New Password: ${newPassword}`);
    } else {
      // Update existing user's password
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        { password: newPassword }
      );

      if (updateError) {
        console.error('Error updating password:', updateError);
        return;
      }

      console.log(`✅ Password reset successful for ${targetAgent.name} (${targetAgent.email})`);
      console.log(`📧 Email: ${targetAgent.email}`);
      console.log(`🔑 New Password: ${newPassword}`);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    process.exit();
  }
}

resetPassword();