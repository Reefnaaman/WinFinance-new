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

// Webhook secret for security
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'WinFinance2025!'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()

    // Verify webhook secret
    const authHeader = request.headers.get('authorization')
    const webhookSecret = request.headers.get('x-webhook-secret')

    if (webhookSecret !== WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid webhook secret' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Handle different webhook payload formats
    const leadData = extractLeadData(body)

    if (!leadData.lead_name || !leadData.phone) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          received: body,
          required: ['lead_name', 'phone']
        },
        { status: 400 }
      )
    }

    // Create lead in database
    const { data: createdLead, error } = await supabase
      .from('leads')
      .insert([{
        lead_name: leadData.lead_name,
        phone: leadData.phone,
        email: leadData.email || null,
        source: leadData.source || 'Other',
        relevance_status: 'ממתין לבדיקה',
        agent_notes: leadData.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create lead', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      lead: createdLead,
      message: 'Lead created successfully'
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

function extractLeadData(body: any): any {
  // Handle different payload formats from manual webhook integrations

  // Format 1: Direct fields
  if (body.lead_name && body.phone) {
    return {
      lead_name: body.lead_name,
      phone: cleanPhoneNumber(body.phone),
      email: body.email,
      source: body.source || 'Other',
      notes: body.notes || body.agent_notes
    }
  }

  // Format 2: Gmail email parsing
  if (body.emailContent || body.email_content) {
    const emailContent = body.emailContent || body.email_content
    return parseEmailForWebhook(emailContent, body.source)
  }

  // Format 3: Google Sheets row
  if (body.name && body.phone) {
    return {
      lead_name: body.name,
      phone: cleanPhoneNumber(body.phone),
      email: body.email,
      source: 'Google Sheet',
      notes: body.notes || body.comments || body.remarks
    }
  }

  // Format 4: Nested data
  if (body.data) {
    return extractLeadData(body.data)
  }

  return {}
}

function parseEmailForWebhook(emailContent: string, sourceName?: string) {
  const result: any = {
    lead_name: '',
    phone: '',
    source: sourceName || 'Email'
  }

  // Extract שם מלא (Full name)
  const nameMatch = emailContent.match(/שם מלא:\s*(.+)/i)
  if (nameMatch) {
    result.lead_name = nameMatch[1].trim()
  }

  // Extract טלפון נייד (Mobile phone) or טלפון
  const phoneMatch = emailContent.match(/טלפון נייד:\s*(.+)/i) || emailContent.match(/טלפון:\s*(.+)/i)
  if (phoneMatch) {
    result.phone = cleanPhoneNumber(phoneMatch[1].trim())
  }

  // Extract email
  const emailMatch = emailContent.match(/אימייל:\s*(.+)/i) || emailContent.match(/מייל:\s*(.+)/i) || emailContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
  if (emailMatch) {
    result.email = emailMatch[1].trim()
  }

  // Build notes from all available info
  const notes = []

  const addressMatch = emailContent.match(/כתובת מלאה:\s*(.+)/i) || emailContent.match(/כתובת:\s*(.+)/i)
  if (addressMatch) {
    notes.push(`כתובת: ${addressMatch[1].trim()}`)
  }

  const notesMatch = emailContent.match(/הערות:\s*(.+)/i)
  if (notesMatch) {
    notes.push(notesMatch[1].trim())
  }

  const campaignMatch = emailContent.match(/התקבל ליד חדש מקמפיין\s*-\s*(.+)/i)
  if (campaignMatch) {
    notes.push(`קמפיין: ${campaignMatch[1].trim()}`)
  }

  const operatorMatch = emailContent.match(/בעזרת טלפנית בשם\s*-\s*(.+)/i)
  if (operatorMatch) {
    notes.push(`טלפנית: ${operatorMatch[1].trim()}`)
  }

  if (notes.length > 0) {
    result.notes = notes.join('\n')
  }

  return result
}

function cleanPhoneNumber(phone: string): string {
  if (!phone) return phone

  // Remove all non-digits
  const digits = phone.replace(/[^\d]/g, '')

  // Ensure Israeli format (start with 0)
  if (digits.length === 9 && !digits.startsWith('0')) {
    return '0' + digits
  }

  return digits.length >= 9 ? digits : phone
}