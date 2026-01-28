import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DuplicatePreventionService } from '@/services/duplicatePreventionService'

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
    const body = await request.json()

    // Validate required fields
    if (!body.lead_name || !body.phone) {
      return NextResponse.json(
        { error: 'שם וטלפון הם שדות חובה' },
        { status: 400 }
      )
    }

    // Use DuplicatePreventionService to check and create lead
    const duplicateService = new DuplicatePreventionService()
    const result = await duplicateService.createLeadSafely(
      {
        lead_name: body.lead_name.trim(),
        phone: body.phone.trim(),
        email: body.email?.trim() || undefined  // Already correct
      },
      body.source || 'manual',
      'manual_entry'
    )

    if (result.duplicate) {
      // Return duplicate information
      return NextResponse.json({
        success: false,
        duplicate: true,
        reason: result.reason,
        message: getHebrewDuplicateMessage(result.reason || 'unknown'),
        existingLead: {
          id: result.existingLead?.id,
          name: result.existingLead?.lead_name,
          phone: result.existingLead?.phone
        }
      }, { status: 409 }) // 409 Conflict
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'שגיאה ביצירת הליד' },
        { status: 500 }
      )
    }

    // Update agent notes if provided
    if (body.agent_notes && result.lead) {
      const supabase = getSupabaseClient()
      await supabase
        .from('leads')
        .update({ agent_notes: body.agent_notes.trim() })
        .eq('id', result.lead.id)
    }

    return NextResponse.json({
      success: true,
      lead: result.lead
    })

  } catch (error) {
    console.error('Lead creation error:', error)
    return NextResponse.json(
      { error: 'שגיאה ביצירת הליד' },
      { status: 500 }
    )
  }
}

function getHebrewDuplicateMessage(reason: string): string {
  switch (reason) {
    case 'exact_phone_match':
      return 'ליד עם מספר טלפון זה כבר קיים במערכת'
    case 'name_and_similar_phone':
      return 'ליד עם שם ומספר טלפון דומה כבר קיים במערכת'
    case 'same_name_within_hour':
    case 'same_name_and_phone_within_hour':
      return 'ליד זהה נוצר בשעה האחרונה - ייתכן שמדובר בכפילות'
    case 'exact_email_match':
      return 'ליד עם כתובת אימייל זו כבר קיים במערכת'
    default:
      return 'ליד זה כבר קיים במערכת'
  }
}