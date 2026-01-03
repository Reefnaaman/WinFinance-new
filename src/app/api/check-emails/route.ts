import { NextRequest, NextResponse } from 'next/server'
import { EmailMonitor } from '@/services/emailMonitor'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting manual email check...')

    const emailMonitor = new EmailMonitor()
    await emailMonitor.checkForNewEmails()

    console.log('✅ Email check completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Email check completed successfully'
    })

  } catch (error) {
    console.error('Email check error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Email check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger email check'
  })
}