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

// Handle Google's webhook verification
export async function GET(request: NextRequest) {
  // Google sends a verification challenge when setting up the webhook
  const challenge = request.nextUrl.searchParams.get('hub.challenge')

  if (challenge) {
    console.log('Gmail webhook verification challenge received:', challenge)
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ status: 'ok' })
}

// Handle incoming email notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Gmail push notification received:', JSON.stringify(body, null, 2))

    // Decode the Pub/Sub message
    const message = body.message
    if (!message) {
      console.log('No message in webhook body')
      return NextResponse.json({ status: 'ok' })
    }

    // The message data is base64 encoded
    const decodedData = Buffer.from(message.data, 'base64').toString('utf-8')
    const data = JSON.parse(decodedData)

    console.log('Decoded message:', data)

    // Gmail sends notifications with historyId
    if (data.emailAddress && data.historyId) {
      console.log(`New email activity for: ${data.emailAddress}`)
      console.log(`History ID: ${data.historyId}`)

      // Log the notification
      const supabase = getSupabaseClient()
      await supabase
        .from('email_logs')
        .insert({
          email_from: data.emailAddress,
          email_subject: `Gmail Push Notification - History: ${data.historyId}`,
          processed_at: new Date().toISOString(),
          lead_created: false,
          raw_content: JSON.stringify(data)
        })

      // Trigger email check
      // We'll call our existing check-gmail endpoint
      const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010'}/api/check-gmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          triggered_by: 'webhook',
          history_id: data.historyId
        })
      })

      if (checkResponse.ok) {
        const result = await checkResponse.json()
        console.log('Email check triggered successfully:', result)
      } else {
        console.error('Failed to trigger email check')
      }
    }

    // Always return 200 to acknowledge receipt
    // Otherwise Google will retry
    return NextResponse.json({ status: 'ok' })

  } catch (error) {
    console.error('Webhook processing error:', error)
    // Still return 200 to prevent retries
    return NextResponse.json({ status: 'ok' })
  }
}