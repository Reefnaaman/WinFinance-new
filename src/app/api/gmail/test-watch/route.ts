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

    const topicName = process.env.GOOGLE_PUBSUB_TOPIC || 'projects/lead-management-crm-483117/topics/gmail-push'

    console.log('Attempting to set up Gmail watch with topic:', topicName)

    try {
      // Try to set up watch WITHOUT any pre-testing
      const watchResponse = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: topicName,
          labelIds: ['INBOX'],
          labelFilterBehavior: 'INCLUDE'
        }
      })

      console.log('Gmail watch set up successfully:', watchResponse.data)

      return NextResponse.json({
        success: true,
        message: 'Gmail watch activated!',
        data: watchResponse.data
      })
    } catch (watchError: any) {
      console.error('Watch setup error details:', watchError.response?.data || watchError.message)

      // Return the actual Gmail API error
      return NextResponse.json({
        error: 'Gmail API Watch Error',
        details: watchError.response?.data?.error || watchError.message,
        hint: 'Check Google Cloud Console for Pub/Sub permissions'
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('General error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error.message
      },
      { status: 500 }
    )
  }
}