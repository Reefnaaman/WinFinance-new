import { NextRequest, NextResponse } from 'next/server'

// This endpoint will be called by Vercel Cron every 6 days
export async function GET(request: NextRequest) {
  try {
    // Call the setup-watch endpoint to renew
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010'}/api/gmail/setup-watch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error('Failed to renew watch')
    }

    const result = await response.json()

    console.log('Gmail watch renewed successfully:', result)

    return NextResponse.json({
      success: true,
      message: 'Gmail watch renewed',
      expires_at: result.expires_at
    })

  } catch (error: any) {
    console.error('Watch renewal error:', error)
    return NextResponse.json(
      { error: 'Failed to renew Gmail watch', details: error.message },
      { status: 500 }
    )
  }
}