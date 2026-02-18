import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// Generate a secure API key
function generateApiKey(): string {
  const prefix = 'wf_'
  const randomBytes = crypto.randomBytes(16).toString('hex')
  return `${prefix}${randomBytes}`
}

// GET - List all API keys (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()

    // This endpoint requires admin access through the web UI
    // You might want to add session validation here

    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select(`
        id,
        agent_id,
        name,
        created_at,
        last_used_at,
        is_active,
        agents (
          id,
          name,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json(
        { error: 'שגיאה בטעינת מפתחות API' },
        { status: 500 }
      )
    }

    // Don't return the actual API key values for security
    return NextResponse.json({ apiKeys })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}

// POST - Generate a new API key for an agent
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const body = await request.json()

    // Validate required fields
    if (!body.agent_id || !body.name) {
      return NextResponse.json(
        { error: 'מזהה סוכן ושם מפתח הם שדות חובה' },
        { status: 400 }
      )
    }

    // Check if agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, email')
      .eq('id', body.agent_id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'סוכן לא נמצא' },
        { status: 404 }
      )
    }

    // Generate new API key
    const apiKey = generateApiKey()

    // Create API key record
    const { data: newApiKey, error: createError } = await supabase
      .from('api_keys')
      .insert({
        agent_id: body.agent_id,
        api_key: apiKey,
        name: body.name,
        permissions: body.permissions || { read: true, write: true }
      })
      .select(`
        id,
        api_key,
        name,
        created_at,
        agent_id
      `)
      .single()

    if (createError) {
      console.error('Error creating API key:', createError)
      return NextResponse.json(
        { error: 'שגיאה ביצירת מפתח API' },
        { status: 500 }
      )
    }

    // Return the new API key (only time it's visible)
    return NextResponse.json({
      success: true,
      apiKey: {
        ...newApiKey,
        agent_name: agent.name,
        agent_email: agent.email
      },
      message: 'מפתח API נוצר בהצלחה. שמור את המפתח במקום בטוח - לא תוכל לראות אותו שוב!'
    }, { status: 201 })

  } catch (error) {
    console.error('API key creation error:', error)
    return NextResponse.json(
      { error: 'שגיאה ביצירת מפתח API' },
      { status: 500 }
    )
  }
}

// PATCH - Update API key status (activate/deactivate)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: 'מזהה מפתח API חסר' },
        { status: 400 }
      )
    }

    const updateData: any = {}

    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active
    }

    if (body.name !== undefined) {
      updateData.name = body.name
    }

    const { data: updatedKey, error } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating API key:', error)
      return NextResponse.json(
        { error: 'שגיאה בעדכון מפתח API' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      apiKey: updatedKey
    })

  } catch (error) {
    console.error('API key update error:', error)
    return NextResponse.json(
      { error: 'שגיאה בעדכון מפתח API' },
      { status: 500 }
    )
  }
}