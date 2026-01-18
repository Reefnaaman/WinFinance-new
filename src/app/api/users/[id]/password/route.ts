import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Create admin client with service role
    const adminSupabase = createServerClient();

    // Update the user's password
    const { error } = await adminSupabase.auth.admin.updateUserById(
      params.id,
      { password }
    );

    if (error) {
      console.error('Password update error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Password update error:', error);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}