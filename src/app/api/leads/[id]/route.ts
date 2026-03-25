import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireApiAuth } from '@/lib/api-auth'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// GET - Fetch a single lead by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const auth = await requireApiAuth(request)
  if (!auth.authorized) {
    return auth.response!
  }

  try {
    const supabase = getSupabaseClient()
    const { id } = await params

    let query = supabase
      .from('leads')
      .select('*')
      .eq('id', id)

    // Agents can only see their assigned leads (unless admin/coordinator)
    if (auth.agent && auth.agent.role === 'agent') {
      query = query.eq('assigned_agent_id', auth.agent.id)
    }

    const { data: lead, error } = await query.single()

    if (error || !lead) {
      return NextResponse.json(
        { error: 'ליד לא נמצא' },
        { status: 404 }
      )
    }

    // Also fetch agent information if assigned
    if (lead.assigned_agent_id) {
      const { data: agent } = await supabase
        .from('agents')
        .select('id, name, email')
        .eq('id', lead.assigned_agent_id)
        .single()

      if (agent) {
        lead.assigned_agent = agent
      }
    }

    return NextResponse.json({ lead })

  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json(
      { error: 'שגיאה בטעינת הליד' },
      { status: 500 }
    )
  }
}

// PATCH - Update a specific lead by ID
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const auth = await requireApiAuth(request)
  if (!auth.authorized) {
    return auth.response!
  }

  try {
    const supabase = getSupabaseClient()
    const { id } = await params
    const body = await request.json()

    // Build update object - only include fields that were provided
    const updateData: any = {}

    // Basic fields
    if (body.lead_name !== undefined) updateData.lead_name = body.lead_name.trim()
    if (body.phone !== undefined) updateData.phone = body.phone.trim()
    if (body.email !== undefined) updateData.email = body.email?.trim() || null
    if (body.source !== undefined) updateData.source = body.source

    // Status fields
    if (body.relevance_status !== undefined) updateData.relevance_status = body.relevance_status
    if (body.status !== undefined) updateData.status = body.status

    // Assignment and scheduling
    if (body.assigned_agent_id !== undefined) updateData.assigned_agent_id = body.assigned_agent_id
    if (body.meeting_date !== undefined) updateData.meeting_date = body.meeting_date
    if (body.scheduled_call_date !== undefined) updateData.scheduled_call_date = body.scheduled_call_date

    // Notes and additional fields
    if (body.agent_notes !== undefined) updateData.agent_notes = body.agent_notes
    if (body.color_code !== undefined) updateData.color_code = body.color_code
    if (body.price !== undefined) updateData.price = body.price

    // Set updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    // Agents can only update their assigned leads (unless admin/coordinator)
    if (auth.agent && auth.agent.role === 'agent') {
      // Check if this agent is assigned to this lead
      const { data: leadCheck } = await supabase
        .from('leads')
        .select('assigned_agent_id')
        .eq('id', id)
        .single()

      if (!leadCheck || leadCheck.assigned_agent_id !== auth.agent.id) {
        return NextResponse.json(
          { error: 'אין לך הרשאה לעדכן ליד זה' },
          { status: 403 }
        )
      }
    }

    // Validate status transitions
    if (body.status === 'תואם') {
      // Check if there's a meeting date in the update or already in the database
      if (!body.meeting_date) {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('meeting_date')
          .eq('id', id)
          .single()

        if (!existingLead?.meeting_date) {
          return NextResponse.json(
            { error: 'תאריך פגישה נדרש כאשר הסטטוס הוא "תואם"' },
            { status: 400 }
          )
        }
      }
    }

    // Perform the update
    const { data: updatedLead, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating lead:', error)
      return NextResponse.json(
        { error: 'שגיאה בעדכון הליד' },
        { status: 500 }
      )
    }

    if (!updatedLead) {
      return NextResponse.json(
        { error: 'ליד לא נמצא' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      lead: updatedLead
    })

  } catch (error) {
    console.error('Lead update error:', error)
    return NextResponse.json(
      { error: 'שגיאה בעדכון הליד' },
      { status: 500 }
    )
  }
}