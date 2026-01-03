import { NextRequest, NextResponse } from 'next/server'

interface ParsedLead {
  lead_name: string
  phone: string
  address?: string
  notes?: string
  source: string
  source_details?: string
}

export async function POST(request: NextRequest) {
  try {
    const { emailContent, sourceName } = await request.json()

    if (!emailContent) {
      return NextResponse.json(
        { error: 'Email content is required' },
        { status: 400 }
      )
    }

    const parsedLead = parseEmailContent(emailContent, sourceName)

    if (!parsedLead.lead_name || !parsedLead.phone) {
      return NextResponse.json(
        {
          error: 'Could not extract required fields (name and phone)',
          parsed: parsedLead
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      parsed: parsedLead
    })

  } catch (error) {
    console.error('Email parsing error:', error)
    return NextResponse.json(
      { error: 'Failed to parse email content' },
      { status: 500 }
    )
  }
}

function parseEmailContent(emailContent: string, sourceName?: string): ParsedLead {
  const result: ParsedLead = {
    lead_name: '',
    phone: '',
    source: sourceName || 'Email'
  }

  // Clean up the email content - remove extra spaces and normalize line breaks
  const cleanContent = emailContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()

  // Extract שם מלא (Full name)
  const nameMatch = cleanContent.match(/שם מלא:\s*(.+)/i)
  if (nameMatch) {
    result.lead_name = nameMatch[1].trim()
  }

  // Extract כתובת מלאה (Full address)
  const addressMatch = cleanContent.match(/כתובת מלאה:\s*(.+)/i)
  if (addressMatch) {
    result.address = addressMatch[1].trim()
  }

  // Extract טלפון נייד (Mobile phone)
  const phoneMatch = cleanContent.match(/טלפון נייד:\s*(.+)/i)
  if (phoneMatch) {
    let phone = phoneMatch[1].trim()
    // Clean phone number - remove spaces and normalize format
    phone = phone.replace(/\s/g, '').replace(/-/g, '')
    // Ensure it starts with 0 for Israeli numbers
    if (phone.length === 9 && !phone.startsWith('0')) {
      phone = '0' + phone
    }
    result.phone = phone
  }

  // Extract הערות (Notes)
  const notesMatch = cleanContent.match(/הערות:\s*(.+)/i)
  if (notesMatch) {
    result.notes = notesMatch[1].trim()
  }

  // If no notes found, try to extract the entire notes section
  if (!result.notes) {
    const notesSectionMatch = cleanContent.match(/הערות:\s*([^]+?)(?:\n\s*$|$)/i)
    if (notesSectionMatch) {
      result.notes = notesSectionMatch[1].trim()
    }
  }

  // Add campaign info as part of notes if found
  const campaignMatch = cleanContent.match(/התקבל ליד חדש מקמפיין\s*-\s*(.+)/i)
  if (campaignMatch) {
    const campaignInfo = `קמפיין: ${campaignMatch[1].trim()}`
    result.notes = result.notes ? `${campaignInfo}\n${result.notes}` : campaignInfo
  }

  // Add operator info if found
  const operatorMatch = cleanContent.match(/בעזרת טלפנית בשם\s*-\s*(.+)/i)
  if (operatorMatch) {
    const operatorInfo = `טלפנית: ${operatorMatch[1].trim()}`
    result.notes = result.notes ? `${operatorInfo}\n${result.notes}` : operatorInfo
  }

  return result
}