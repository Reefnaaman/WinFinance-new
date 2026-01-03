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
    const supabase = getSupabaseClient()
    const { emailContent, sourceName, autoCreate = false } = await request.json()

    if (!emailContent) {
      return NextResponse.json(
        { error: 'Email content is required' },
        { status: 400 }
      )
    }

    // Parse the email content
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

    // If autoCreate is true, create the lead in the database
    if (autoCreate) {
      const leadData = {
        lead_name: parsedLead.lead_name,
        phone: parsedLead.phone,
        email: null, // Can be extracted if found in email
        source: 'Email', // Use fixed enum value
        relevance_status: 'ממתין לבדיקה', // Pending review
        agent_notes: buildNotesFromParsedData(parsedLead, sourceName),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdLead, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single()

      if (error) {
        console.error('Database error creating lead:', error)
        return NextResponse.json(
          { error: 'Failed to create lead in database', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        created: true,
        lead: createdLead,
        parsed: parsedLead
      })
    }

    // Just return parsed data if not auto-creating
    return NextResponse.json({
      success: true,
      parsed: parsedLead
    })

  } catch (error) {
    console.error('Email processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process email content' },
      { status: 500 }
    )
  }
}

function buildNotesFromParsedData(parsed: ParsedLead, customSource?: string): string {
  const notes = []

  // Add custom source name if provided
  if (customSource && customSource !== 'Email') {
    notes.push(`מקור: ${customSource}`)
  }

  if (parsed.address) {
    notes.push(`כתובת: ${parsed.address}`)
  }

  if (parsed.notes) {
    notes.push(parsed.notes)
  }

  return notes.join('\n')
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