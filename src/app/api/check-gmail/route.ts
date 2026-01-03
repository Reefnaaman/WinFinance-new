import { NextRequest, NextResponse } from 'next/server'
import { GmailService } from '@/services/gmailService'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'

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
    // Get current session
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No authenticated user' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    console.log(`Checking Gmail for user: ${userEmail}`)

    const gmailService = new GmailService()

    // Get list of messages from leadmail@raion.co.il (both read and unread)
    // You can adjust the query to include date ranges or other filters
    const query = 'from:leadmail@raion.co.il' // This will get ALL emails from this sender
    // Alternative queries:
    // 'from:leadmail@raion.co.il is:unread' - only unread
    // 'from:leadmail@raion.co.il after:2024/1/1' - emails after specific date

    const messages = await gmailService.listMessages(userEmail, query)

    if (!messages || messages.length === 0) {
      console.log('No new emails found')
      return NextResponse.json({
        success: true,
        message: 'No new emails found',
        processed: 0
      })
    }

    console.log(`Found ${messages.length} unread emails`)

    let processedCount = 0
    let createdLeads = 0
    const errors = []

    // Process each message
    for (const message of messages) {
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
              source: 'Raion Email',  // Changed to identify source
              relevance_status: 'ממתין לבדיקה',
              agent_notes: leadData.notes || `נשלח מ: ${from}\nנושא: ${subject}\nתאריך: ${date}`,
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
          console.log(`Email ${message.id} doesn't contain lead information`)

          // You might want to still mark it as read if it's from specific senders
          // For now, we'll leave it unread
        }

        processedCount++
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error)
        errors.push(`Error processing message ${message.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Log the check
    await supabase
      .from('email_logs')
      .insert({
        email_from: userEmail,
        email_subject: `Gmail Check - Processed ${processedCount} emails`,
        processed_at: new Date().toISOString(),
        lead_created: createdLeads > 0,
        raw_content: `Checked ${messages.length} emails, created ${createdLeads} leads`
      })

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} emails, created ${createdLeads} leads`,
      processed: processedCount,
      created: createdLeads,
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
  // Call the same logic as POST
  return POST(request)
}