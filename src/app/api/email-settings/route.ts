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

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error
    }

    return NextResponse.json({
      success: true,
      settings: data || null
    })

  } catch (error) {
    console.error('Error fetching email settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const body = await request.json()

    const {
      email_host,
      email_port,
      email_username,
      email_password,
      email_secure,
      monitored_email_addresses,
      email_enabled
    } = body

    // Validate required fields
    if (!email_host || !email_port || !email_username || !email_password) {
      return NextResponse.json(
        { error: 'Missing required email configuration fields' },
        { status: 400 }
      )
    }

    // Check if settings exist
    const { data: existing } = await supabase
      .from('email_settings')
      .select('id')
      .single()

    let result
    if (existing) {
      // Update existing settings
      result = await supabase
        .from('email_settings')
        .update({
          email_host,
          email_port: parseInt(email_port),
          email_username,
          email_password, // In production, this should be encrypted
          email_secure: !!email_secure,
          monitored_email_addresses: Array.isArray(monitored_email_addresses)
            ? monitored_email_addresses
            : monitored_email_addresses?.split(',').map((e: string) => e.trim()).filter(Boolean) || [],
          email_enabled: !!email_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      // Create new settings
      result = await supabase
        .from('email_settings')
        .insert([{
          email_host,
          email_port: parseInt(email_port),
          email_username,
          email_password, // In production, this should be encrypted
          email_secure: !!email_secure,
          monitored_email_addresses: Array.isArray(monitored_email_addresses)
            ? monitored_email_addresses
            : monitored_email_addresses?.split(',').map((e: string) => e.trim()).filter(Boolean) || [],
          email_enabled: !!email_enabled,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()
    }

    if (result.error) {
      throw result.error
    }

    return NextResponse.json({
      success: true,
      settings: result.data
    })

  } catch (error) {
    console.error('Error saving email settings:', error)
    return NextResponse.json(
      { error: 'Failed to save email settings' },
      { status: 500 }
    )
  }
}