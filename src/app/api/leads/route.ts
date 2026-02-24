import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DuplicatePreventionService } from '@/services/duplicatePreventionService'
import { WhatsAppQueueService } from '@/services/whatsappQueueService'
import { requireApiAuth } from '@/lib/api-auth'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// GET - Fetch leads with filters
export async function GET(request: NextRequest) {
  // Check authentication
  const auth = await requireApiAuth(request)
  if (!auth.authorized) {
    return auth.response!
  }

  try {
    const supabase = getSupabaseClient()
    const searchParams = request.nextUrl.searchParams

    // Extract query parameters
    const relevanceStatus = searchParams.get('relevance_status')
    const assignedAgentId = searchParams.get('assigned_agent_id')
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const createdAfter = searchParams.get('created_after')
    const createdBefore = searchParams.get('created_before')
    const leadId = searchParams.get('id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Start building query
    let query = supabase.from('leads').select('*', { count: 'exact' })

    // Apply filters
    if (leadId) {
      query = query.eq('id', leadId)
    }

    // Agents can only see their assigned leads (unless admin/coordinator)
    if (auth.agent && auth.agent.role === 'agent') {
      query = query.eq('assigned_agent_id', auth.agent.id)
    }
    if (relevanceStatus) {
      query = query.eq('relevance_status', relevanceStatus)
    }
    if (assignedAgentId) {
      query = query.eq('assigned_agent_id', assignedAgentId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (source) {
      query = query.eq('source', source)
    }
    if (createdAfter) {
      query = query.gte('created_at', createdAfter)
    }
    if (createdBefore) {
      query = query.lte('created_at', createdBefore)
    }

    // Add pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    // Order by created_at descending
    query = query.order('created_at', { ascending: false })

    const { data: leads, error, count } = await query

    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json(
        { error: 'שגיאה בטעינת הלידים' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}

// POST - Create a new lead
export async function POST(request: NextRequest) {
  // Check authentication
  const auth = await requireApiAuth(request)
  if (!auth.authorized) {
    return auth.response!
  }

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
        email: body.email?.trim() || undefined
      },
      body.source || 'Manual',
      body.api_caller || 'api_direct'
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
          phone: result.existingLead?.phone,
          status: result.existingLead?.status,
          assigned_agent_id: result.existingLead?.assigned_agent_id
        }
      }, { status: 409 }) // 409 Conflict
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'שגיאה ביצירת הליד' },
        { status: 500 }
      )
    }

    // Update additional fields if provided
    if (result.lead && (body.agent_notes || body.relevance_status || body.assigned_agent_id)) {
      const supabase = getSupabaseClient()
      const updateData: any = {}

      if (body.agent_notes) updateData.agent_notes = body.agent_notes.trim()
      if (body.relevance_status) updateData.relevance_status = body.relevance_status
      if (body.assigned_agent_id) updateData.assigned_agent_id = body.assigned_agent_id

      const { data: updatedLead } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', result.lead.id)
        .select()
        .single()

      if (updatedLead) {
        result.lead = updatedLead
      }
    }

    // Queue lead for WhatsApp outreach (non-blocking)
    if (result.lead) {
      try {
        const queueService = new WhatsAppQueueService()
        const queueResult = await queueService.queueLeadForOutreach(
          result.lead.id,
          result.lead.lead_name,
          result.lead.phone
        )
        if (queueResult.queued) {
          console.log(`Lead ${result.lead.id} queued for WhatsApp: ${queueResult.scheduledDate} ${queueResult.scheduledBatch}`)
        }
      } catch (queueError) {
        // Non-blocking: don't fail lead creation if queue fails
        console.error('WhatsApp queue error (non-blocking):', queueError)
      }
    }

    return NextResponse.json({
      success: true,
      lead: result.lead
    }, { status: 201 })

  } catch (error) {
    console.error('Lead creation error:', error)
    return NextResponse.json(
      { error: 'שגיאה ביצירת הליד' },
      { status: 500 }
    )
  }
}

// PATCH - Update a lead
export async function PATCH(request: NextRequest) {
  // Check authentication
  const auth = await requireApiAuth(request)
  if (!auth.authorized) {
    return auth.response!
  }

  try {
    const supabase = getSupabaseClient()
    const body = await request.json()

    // Lead ID is required
    if (!body.id) {
      return NextResponse.json(
        { error: 'מזהה ליד חסר' },
        { status: 400 }
      )
    }

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
      const { data: lead } = await supabase
        .from('leads')
        .select('assigned_agent_id')
        .eq('id', body.id)
        .single()

      if (!lead || lead.assigned_agent_id !== auth.agent.id) {
        return NextResponse.json(
          { error: 'אין לך הרשאה לעדכן ליד זה' },
          { status: 403 }
        )
      }
    }

    // Validate status transitions
    if (body.status === 'תואם' && !body.meeting_date && !updateData.meeting_date) {
      // Check if there's already a meeting date
      const { data: existingLead } = await supabase
        .from('leads')
        .select('meeting_date')
        .eq('id', body.id)
        .single()

      if (!existingLead?.meeting_date) {
        return NextResponse.json(
          { error: 'תאריך פגישה נדרש כאשר הסטטוס הוא "תואם"' },
          { status: 400 }
        )
      }
    }

    // Perform the update
    const { data: updatedLead, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', body.id)
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