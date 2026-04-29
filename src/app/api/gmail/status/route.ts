import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('gmail_tokens')
      .select('user_email, token_expiry, refresh_token, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[gmail-status] Supabase error:', error)
      return NextResponse.json({
        connected: false,
        email: null,
        expiresAt: null,
        expired: false,
        hasRefreshToken: false,
        error: error.message,
      })
    }

    if (!data) {
      return NextResponse.json({
        connected: false,
        email: null,
        expiresAt: null,
        expired: false,
        hasRefreshToken: false,
      })
    }

    const expiresAt = data.token_expiry ?? null
    const expired = expiresAt ? new Date(expiresAt) <= new Date() : true

    return NextResponse.json({
      connected: !expired,
      email: data.user_email ?? null,
      expiresAt,
      expired,
      hasRefreshToken: !!data.refresh_token,
    })
  } catch (err) {
    console.error('[gmail-status] Route error:', err)
    return NextResponse.json(
      {
        connected: false,
        email: null,
        expiresAt: null,
        expired: false,
        hasRefreshToken: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
