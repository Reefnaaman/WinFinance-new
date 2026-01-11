import { NextRequest, NextResponse } from 'next/server'
import { GmailService } from '@/services/gmailService'
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

    // For now, allow all requests since this is only called from admin panel or webhook
    // The admin panel itself requires authentication to access
    const body = await request.json().catch(() => ({}))

    // Get the actual connected Gmail account from the database
    const { data: tokenData } = await supabase
      .from('gmail_tokens')
      .select('user_email')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const userEmail = tokenData?.user_email || 'peleg@winfinance.co.il'

    console.log(`Checking Gmail for: ${userEmail}`)

    const gmailService = new GmailService()

    // Check if this is from webhook (instant processing) or manual (batch processing)
    const isWebhook = body.triggered_by === 'webhook'

    let query: string
    if (isWebhook) {
      // For webhook: check RECENT emails (last hour) regardless of read status
      // This ensures we catch emails even if they were auto-marked as read
      query = `(from:leadmail@raion.co.il OR from:reefnoyman55@gmail.com) newer_than:1h`
      console.log('Webhook trigger - checking emails from last hour (read and unread)')
    } else {
      // For manual check: get emails from past 2 days
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      const dateString = `${twoDaysAgo.getFullYear()}/${twoDaysAgo.getMonth() + 1}/${twoDaysAgo.getDate()}`
      query = `(from:leadmail@raion.co.il OR from:reefnoyman55@gmail.com) after:${dateString}`
      console.log('Manual check - checking emails from past 2 days')
    }

    console.log(`Query: ${query}`)

    const messages = await gmailService.listMessages(userEmail, query)

    if (!messages || messages.length === 0) {
      console.log('No new emails found')
      return NextResponse.json({
        success: true,
        message: 'No new emails found',
        processed: 0
      })
    }

    // Limit processing to prevent flooding
    const MAX_EMAILS_PER_RUN = 20;
    const messagesToProcess = messages.slice(0, MAX_EMAILS_PER_RUN);

    console.log(`Found ${messages.length} unread emails, processing first ${messagesToProcess.length}`)

    let processedCount = 0
    let createdLeads = 0
    let skippedInvalid = 0
    const errors = []

    // Process each message
    for (const message of messagesToProcess) {
      try {
        // Get full message details
        const fullMessage = await gmailService.getMessage(userEmail, message.id!)

        // Parse email content
        const { text, html, from, subject, date } = gmailService.parseEmailContent(fullMessage)

        // Use text content first, fallback to HTML
        const emailContent = text || html

        if (!emailContent) {
          console.log(`Skipping message ${message.id} - no content`)
          continue
        }

        // Try to parse lead information
        const leadData = gmailService.parseLeadFromEmail(emailContent)

        if (leadData && leadData.lead_name && leadData.phone) {
          console.log(`Parsed lead: ${leadData.lead_name} - ${leadData.phone}`)
          // Check if lead already exists with same phone number
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id, lead_name, phone')
            .eq('phone', leadData.phone)
            .single()

          if (existingLead) {
            console.log(`Lead with phone ${leadData.phone} already exists, skipping`)
            // Still mark as read to avoid reprocessing
            await gmailService.markAsRead(userEmail, message.id!)
            continue
          }

          // Create lead in database
          const { data: newLead, error: leadError } = await supabase
            .from('leads')
            .insert({
              lead_name: leadData.lead_name,
              phone: leadData.phone,
              email: leadData.email || null,
              source: 'Email',  // Standard enum value for email sources
              relevance_status: 'ממתין לבדיקה',
              agent_notes: leadData.notes || null,  // Only use actual notes from email content
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (leadError) {
            console.error('Error creating lead:', leadError)
            errors.push(`Failed to create lead from email ${message.id}: ${leadError.message}`)
          } else {
            console.log('Lead created successfully:', newLead.id)
            createdLeads++

            // Mark email as read
            await gmailService.markAsRead(userEmail, message.id!)
          }
        } else {
          console.log(`Email ${message.id} doesn't contain valid lead information`)
          console.log(`Subject: ${subject}`)
          console.log(`From: ${from}`)
          skippedInvalid++

          // You might want to still mark it as read if it's from specific senders
          // For now, we'll leave it unread
        }

        processedCount++
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error)
        errors.push(`Error processing message ${message.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Log the check with detailed info
    await supabase
      .from('email_logs')
      .insert({
        email_from: userEmail,
        email_subject: `Gmail Check - Processed ${processedCount} emails`,
        processed_at: new Date().toISOString(),
        lead_created: createdLeads > 0,
        raw_content: JSON.stringify({
          query: query,
          isWebhook: isWebhook,
          totalFound: messages.length,
          processed: processedCount,
          created: createdLeads,
          skipped: skippedInvalid,
          userEmail: userEmail
        })
      })

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} emails, created ${createdLeads} leads`,
      processed: processedCount,
      created: createdLeads,
      skippedInvalid: skippedInvalid,
      totalFound: messages.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Gmail check error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check Gmail',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Vercel cron jobs use GET requests
  // Just call POST directly
  return POST(request)
}