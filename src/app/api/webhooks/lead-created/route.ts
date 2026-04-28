import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DuplicatePreventionService } from '@/services/duplicatePreventionService'
import { parseLeadEmail, cleanPhoneNumber } from '@/lib/leadEmailParser'

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

    // Use DuplicatePreventionService to prevent duplicates
    const duplicateService = new DuplicatePreventionService()
    const result = await duplicateService.createLeadSafely(
      {
        lead_name: leadData.lead_name,
        phone: leadData.phone,
        email: leadData.email || undefined  // Convert null/empty to undefined
      },
      leadData.source || 'Other',
      'webhook'
    )

    if (result.duplicate) {
      console.log(`Duplicate prevented via webhook: ${leadData.lead_name} - Reason: ${result.reason}`)
      return NextResponse.json({
        success: false,
        duplicate: true,
        reason: result.reason,
        message: `Lead already exists (${result.reason})`,
        existingLeadId: result.existingLead?.id
      }, { status: 409 }) // 409 Conflict
    }

    if (!result.success) {
      console.error('Failed to create lead:', result.error)
      return NextResponse.json(
        { error: 'Failed to create lead', details: result.error },
        { status: 500 }
      )
    }

    // Add notes if provided
    if (leadData.notes && result.lead) {
      await supabase
        .from('leads')
        .update({ agent_notes: leadData.notes })
        .eq('id', result.lead.id)
    }

    return NextResponse.json({
      success: true,
      lead: result.lead,
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
  const parsed = parseLeadEmail(emailContent, { sourceName })
  if (!parsed) {
    return { lead_name: '', phone: '', source: sourceName || 'email' }
  }
  return {
    lead_name: parsed.lead_name,
    phone: parsed.phone,
    email: parsed.email,
    source: parsed.source,
    notes: parsed.notes,
  }
}