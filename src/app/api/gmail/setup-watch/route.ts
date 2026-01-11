import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
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

    // Get the Gmail token from database
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'No Gmail tokens found. Please connect Gmail first.' },
        { status: 401 }
      )
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    )

    // Set the tokens
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
    })

    // Create Gmail client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // YOUR TOPIC NAME FROM STEP 3
    const topicName = process.env.GOOGLE_PUBSUB_TOPIC || 'projects/YOUR-PROJECT-ID/topics/gmail-push'

    // Set up watch on INBOX
    const watchResponse = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: topicName,
        labelIds: ['INBOX'],
        labelFilterBehavior: 'INCLUDE'
      }
    })

    console.log('Gmail watch set up successfully:', watchResponse.data)

    // Save watch details to database
    await supabase
      .from('gmail_watch')
      .upsert({
        id: tokenData.user_email,
        email: tokenData.user_email,
        history_id: watchResponse.data.historyId,
        expiration: new Date(parseInt(watchResponse.data.expiration || '0')).toISOString(),
        created_at: new Date().toISOString()
      })

    // Calculate when watch expires
    const expirationDate = new Date(parseInt(watchResponse.data.expiration || '0'))
    const hoursUntilExpiry = Math.floor((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60))

    return NextResponse.json({
      success: true,
      message: `Gmail notifications activated! Will expire in ${hoursUntilExpiry} hours.`,
      expires_at: expirationDate.toISOString(),
      history_id: watchResponse.data.historyId
    })

  } catch (error: any) {
    console.error('Watch setup error:', error)
    return NextResponse.json(
      {
        error: 'Failed to set up Gmail notifications',
        details: error.message,
        hint: 'Make sure you added the topic name to your .env.local file'
      },
      { status: 500 }
    )
  }
}