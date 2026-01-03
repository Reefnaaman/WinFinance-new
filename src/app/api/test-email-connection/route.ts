import { NextRequest, NextResponse } from 'next/server'
import { EmailMonitor } from '@/services/emailMonitor'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Testing email connection...')

    const emailMonitor = new EmailMonitor()
    const result = await emailMonitor.testConnection()

    console.log('✅ Email connection test completed:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Email connection test error:', error)

    return NextResponse.json(
      {
        success: false,
        message: `שגיאה בבדיקת החיבור: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`
      },
      { status: 500 }
    )
  }
}