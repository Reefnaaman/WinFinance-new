import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { name, email, role } = await request.json();

    // Create admin client with service role
    const adminSupabase = createServerClient();

    // First create the auth user
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password: 'TempPassword123!', // Temporary password - user should reset
      email_confirm: true
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Then create the agent record with the same ID
    const { data: agent, error: agentError } = await adminSupabase
      .from('agents')
      .insert({
        id: authUser.user.id,
        name,
        email,
        role
      } as any)
      .select()
      .single();

    if (agentError) {
      console.error('Agent creation error:', agentError);
      // If agent creation fails, clean up the auth user
      await adminSupabase.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: agentError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: agent });

  } catch (error) {
    console.error('User creation error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}