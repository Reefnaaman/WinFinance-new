import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { GmailService } from '@/services/gmailService'

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
    console.log('Gmail push notification received')

    // Decode the Pub/Sub message
    const message = body.message
    if (!message) {
      return NextResponse.json({ status: 'ok' })
    }

    // The message data is base64 encoded
    const decodedData = Buffer.from(message.data, 'base64').toString('utf-8')
    const data = JSON.parse(decodedData)

    console.log('Notification for:', data.emailAddress, 'History:', data.historyId)

    if (data.emailAddress && data.historyId) {
      const supabase = getSupabaseClient()

      // Log the notification
      await supabase
        .from('email_logs')
        .insert({
          email_from: data.emailAddress,
          email_subject: `Gmail Push Notification - History: ${data.historyId}`,
          processed_at: new Date().toISOString(),
          lead_created: false,
          raw_content: JSON.stringify(data)
        })

      // FETCH EMAILS DIRECTLY HERE (no authentication needed!)
      try {
        // Get Gmail token from database
        const { data: tokenData } = await supabase
          .from('gmail_tokens')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!tokenData) {
          console.log('No Gmail token found')
          return NextResponse.json({ status: 'ok' })
        }

        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
        )

        // Set tokens
        oauth2Client.setCredentials({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
        })

        // If token is expired, refresh it
        if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
          const { credentials } = await oauth2Client.refreshAccessToken()
          oauth2Client.setCredentials(credentials)

          // Update token in database
          await supabase
            .from('gmail_tokens')
            .update({
              access_token: credentials.access_token,
              refresh_token: credentials.refresh_token || tokenData.refresh_token,
              expires_at: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null
            })
            .eq('id', tokenData.id)
        }

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

        // Get recent unread messages
        const listResponse = await gmail.users.messages.list({
          userId: 'me',
          labelIds: ['INBOX'],
          q: 'is:unread',
          maxResults: 10
        })

        const messages = listResponse.data.messages || []
        console.log(`Found ${messages.length} unread messages`)

        let leadsCreated = 0

        for (const message of messages) {
          try {
            // Get full message
            const fullMessage = await gmail.users.messages.get({
              userId: 'me',
              id: message.id!
            })

            // Parse lead from email
            const gmailService = new GmailService()

            // Extract email content
            const { text, html, from, subject, date } = gmailService.parseEmailContent(fullMessage.data)
            const emailContent = text || html || ''

            // Parse lead information
            const leadInfo = gmailService.parseLeadFromEmail(emailContent)

            if (leadInfo && leadInfo.lead_name && leadInfo.phone) {
              // Check if lead already exists
              const { data: existingLead } = await supabase
                .from('leads')
                .select('id')
                .eq('phone', leadInfo.phone)
                .single()

              if (!existingLead) {
                // Create new lead
                const { data: newLead, error } = await supabase
                  .from('leads')
                  .insert({
                    lead_name: leadInfo.lead_name,
                    phone: leadInfo.phone,
                    email: leadInfo.email || '',
                    source: 'email',
                    relevance_status: 'ממתין לבדיקה',
                    created_at: new Date().toISOString()
                  })
                  .select()

                if (error) {
                  console.error('Error creating lead:', error)
                } else {
                  console.log('Lead created:', leadInfo.lead_name, leadInfo.phone)
                  leadsCreated++

                  // Mark message as read
                  await gmail.users.messages.modify({
                    userId: 'me',
                    id: message.id!,
                    requestBody: {
                      removeLabelIds: ['UNREAD']
                    }
                  })
                }
              } else {
                console.log('Lead already exists:', leadInfo.phone)
              }
            }
          } catch (error) {
            console.error('Error processing message:', error)
          }
        }

        console.log(`Webhook processed. Created ${leadsCreated} new leads`)

        // Update log entry
        await supabase
          .from('email_logs')
          .insert({
            email_from: 'webhook-processor',
            email_subject: `Processed ${messages.length} emails, created ${leadsCreated} leads`,
            processed_at: new Date().toISOString(),
            lead_created: leadsCreated > 0,
            raw_content: JSON.stringify({ messages: messages.length, leads: leadsCreated })
          })

      } catch (error) {
        console.error('Error fetching emails:', error)
      }
    }

    return NextResponse.json({ status: 'ok' })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ status: 'ok' })
  }
}