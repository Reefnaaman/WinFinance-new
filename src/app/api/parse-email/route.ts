import { NextRequest, NextResponse } from 'next/server'
import { parseLeadEmail } from '@/lib/leadEmailParser'

export async function POST(request: NextRequest) {
  try {
    const { emailContent, sourceName } = await request.json()

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

    return NextResponse.json({
      success: true,
      parsed: parsedLead,
    })
  } catch (error) {
    console.error('Email parsing error:', error)
    return NextResponse.json(
      { error: 'Failed to parse email content' },
      { status: 500 }
    )
  }
}
