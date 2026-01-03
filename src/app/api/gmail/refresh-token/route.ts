import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    // Get the most recent Gmail token
    const { data: tokenData, error: fetchError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !tokenData) {
      return NextResponse.json(
        { error: 'No Gmail tokens found' },
        { status: 404 }
      )
    }

    // Refresh the access token using the refresh token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      console.error('Failed to refresh token:', refreshedTokens)
      return NextResponse.json(
        { error: 'Failed to refresh token', details: refreshedTokens },
        { status: 400 }
      )
    }

    // Calculate new expiry time (expires_in is in seconds)
    const tokenExpiry = new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString()

    // Update tokens in database
    const { data: updatedToken, error: updateError } = await supabase
      .from('gmail_tokens')
      .update({
        access_token: refreshedTokens.access_token,
        token_expiry: tokenExpiry,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenData.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update tokens', details: updateError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      expiresAt: tokenExpiry,
      data: updatedToken
    })

  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}