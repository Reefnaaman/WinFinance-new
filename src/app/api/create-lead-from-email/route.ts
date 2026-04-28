import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseLeadEmail } from '@/lib/leadEmailParser'

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
    const { emailContent, sourceName, autoCreate = false } = await request.json()

    if (!emailContent) {
      return NextResponse.json(
        { error: 'Email content is required' },
        { status: 400 }
      )
    }

    const parsedLead = parseLeadEmail(emailContent, { sourceName })

    if (!parsedLead) {
      return NextResponse.json(
        {
          error: 'Could not extract required fields (name and phone)',
          parsed: null,
        },
        { status: 400 }
      )
    }

    if (autoCreate) {
      const leadData = {
        lead_name: parsedLead.lead_name,
        phone: parsedLead.phone,
        email: parsedLead.email ?? null,
        source: 'email',
        relevance_status: 'ממתין לבדיקה',
        agent_notes: parsedLead.notes ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data: createdLead, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single()

      if (error) {
        console.error('Database error creating lead:', error)
        return NextResponse.json(
          { error: 'Failed to create lead in database', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        created: true,
        lead: createdLead,
        parsed: parsedLead,
      })
    }

    return NextResponse.json({
      success: true,
      parsed: parsedLead,
    })
  } catch (error) {
    console.error('Email processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process email content' },
      { status: 500 }
    )
  }
}
