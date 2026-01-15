import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    console.log('Test webhook called')

    // Test environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Missing Supabase environment variables',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
        url: supabaseUrl ? 'Set' : 'Missing',
        key: supabaseServiceKey ? 'Set' : 'Missing'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Try to insert a test log
    const { data, error } = await supabase
      .from('email_logs')
      .insert({
        email_from: 'test@webhook.com',
        email_subject: 'Test Webhook - ' + new Date().toISOString(),
        processed_at: new Date().toISOString(),
        lead_created: false,
        raw_content: JSON.stringify({ test: true, timestamp: Date.now() })
      })
      .select()

    if (error) {
      return NextResponse.json({
        error: 'Database insert failed',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Test successful - check email_logs table',
      data: data
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error.message
    }, { status: 500 })
  }
}