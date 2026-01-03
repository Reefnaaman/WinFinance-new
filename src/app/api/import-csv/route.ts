import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function mapStatusToEnum(status: string): string | null {
  if (!status || !status.trim()) return null;

  const statusStr = status.toLowerCase().trim();

  // Direct mappings for exact matches
  if (statusStr.includes('תואם')) return 'תואם';
  if (statusStr.includes('לא תואם')) return 'לא תואם';
  if (statusStr.includes('נסגר') || statusStr.includes('נמכר')) return 'עסקה נסגרה';

  // Map "לא רצה" and similar to "התקיימה - כשלון"
  if (statusStr.includes('לא רצה') || statusStr.includes('לא מעוניין')) return 'התקיימה - כשלון';

  // Complex status mapping based on your data
  if (statusStr.includes('במעקב')) return 'תואם';
  if (statusStr.includes('יש לו חברה') || statusStr.includes('יש לה חברים')) return 'לא תואם';
  if (statusStr.includes('אין מענה')) return 'לא תואם';
  if (statusStr.includes('לקוח לא אפוי')) return 'לא תואם';

  // If status contains agent name, likely means assigned/scheduled
  if (statusStr.includes('עדי') || statusStr.includes('יקיר') ||
      statusStr.includes('דור') || statusStr.includes('עידן') ||
      statusStr.includes('פלג')) {
    return 'תואם';
  }

  // Default for any status with content
  return null;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;

  const cleanDate = dateStr.trim();

  // Format: DD.MM.YY or DD.MM.YYYY (like "28.10- 17:00")
  const ddmmyyRegex = /(\d{1,2})\.(\d{1,2})(?:-?\s*(\d{2,4}))?/;
  const match = cleanDate.match(ddmmyyRegex);

  if (match) {
    let [, day, month, year] = match;

    // If no year found, assume current year or next year
    if (!year) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // If the month is before current month, assume next year
      year = parseInt(month) < currentMonth ? (currentYear + 1).toString() : currentYear.toString();
    } else if (year.length === 2) {
      // Convert 2-digit year to 4-digit
      const currentYear = new Date().getFullYear();
      const century = Math.floor(currentYear / 100) * 100;
      year = (century + parseInt(year)).toString();
    }

    // Create ISO date string (YYYY-MM-DD)
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // Validate the date
    const testDate = new Date(isoDate);
    if (testDate.getFullYear().toString() === year &&
        (testDate.getMonth() + 1).toString() === parseInt(month).toString() &&
        testDate.getDate().toString() === parseInt(day).toString()) {
      return isoDate;
    }
  }

  // Handle Hebrew day names (like "יום שלישי 17:30")
  if (cleanDate.includes('יום')) {
    const timeMatch = cleanDate.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      // For now, return today's date as a fallback
      // You could implement more sophisticated logic to calculate actual dates
      const today = new Date();
      return today.toISOString().split('T')[0];
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    // Get existing agents for mapping
    const { data: agents } = await supabase.from('agents').select('*');
    const agentMap: { [key: string]: string } = {};

    agents?.forEach(agent => {
      agentMap[agent.name] = agent.id;
      // Add variations for partial matching
      if (agent.name === 'עדי בראל') {
        agentMap['עדי'] = agent.id;
      }
      if (agent.name === 'דור') {
        agentMap['דור לוסקי'] = agent.id;
        agentMap['לוסקי'] = agent.id;
      }
      if (agent.name === 'פלג') {
        agentMap['לפלג'] = agent.id;
      }
    });

    const leads = [];
    const errors = [];

    // Skip header if it exists (detect by checking if first line contains column names)
    const startIndex = lines[0].includes('נייד') || lines[0].includes('שם לקוח') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      try {
        const fields = parseCSVLine(lines[i]);

        // Actual format: [phone, empty, status, meetingInfo, empty, customerName, agentName, extra]
        if (fields.length < 6) continue; // Skip incomplete rows

        const [phone, , statusRaw, meetingDateRaw, , customerName, agentName, ...rest] = fields;

        if (!phone || !customerName) continue; // Skip rows without essential data

        // Clean and format phone number to Israeli format (0xx-xxxxxxx)
        const cleanPhone = phone.replace(/[^\d]/g, '');
        let formattedPhone = phone; // fallback to original

        if (cleanPhone.length === 9) {
          // Add leading 0 and format as 0xx-xxxxxxx
          formattedPhone = `0${cleanPhone.substring(0, 2)}-${cleanPhone.substring(2)}`;
        } else if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
          // Already has leading 0, just format as 0xx-xxxxxxx
          formattedPhone = `${cleanPhone.substring(0, 3)}-${cleanPhone.substring(3)}`;
        } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('0')) {
          // Has 10 digits but no leading 0, add 0 and format
          formattedPhone = `0${cleanPhone.substring(0, 2)}-${cleanPhone.substring(2)}`;
        }

        // Map agent name to ID
        let assignedAgentId = null;
        if (agentName && agentName.trim()) {
          const cleanAgentName = agentName.trim();
          assignedAgentId = agentMap[cleanAgentName];

          // Try partial matching for agent names
          if (!assignedAgentId) {
            for (const [name, id] of Object.entries(agentMap)) {
              if (cleanAgentName.includes(name) || name.includes(cleanAgentName)) {
                assignedAgentId = id;
                break;
              }
            }
          }
        }

        // Map status to enum
        const mappedStatus = statusRaw ? mapStatusToEnum(statusRaw) : null;

        // Parse meeting date
        const meetingDate = parseDate(meetingDateRaw);

        // Extract color information from status, extra fields, or dedicated color column
        let colorCode = null;
        const allFields = [statusRaw, ...rest].join(' ').toLowerCase();

        // Check if there's a dedicated color column (usually in rest fields)
        const colorColumn = rest.find(field =>
          field && ['ירוק', 'אדום', 'צהוב', 'כחול', 'כתום', 'סגול', 'לבן', 'green', 'red', 'yellow', 'blue', 'orange', 'purple', 'white'].includes(field.toLowerCase().trim())
        );

        if (colorColumn) {
          const normalizedColor = colorColumn.toLowerCase().trim();
          // Map English color names to Hebrew
          const colorMap: { [key: string]: string } = {
            'green': 'ירוק', 'ירוק': 'ירוק', 'ירו': 'ירוק',
            'red': 'אדום', 'אדום': 'אדום', 'אד': 'אדום',
            'yellow': 'צהוב', 'צהוב': 'צהוב', 'צה': 'צהוב',
            'blue': 'כחול', 'כחול': 'כחול', 'כח': 'כחול',
            'orange': 'כתום', 'כתום': 'כתום',
            'purple': 'סגול', 'סגול': 'סגול',
            'white': 'לבן', 'לבן': 'לבן'
          };
          colorCode = colorMap[normalizedColor] || null;
        }

        // If no dedicated color column, try to detect from Hebrew color words in text
        if (!colorCode) {
          if (allFields.includes('ירוק') || allFields.includes('ירו')) {
            colorCode = 'ירוק';
          } else if (allFields.includes('אדום') || allFields.includes('אד')) {
            colorCode = 'אדום';
          } else if (allFields.includes('צהוב') || allFields.includes('צה')) {
            colorCode = 'צהוב';
          } else if (allFields.includes('כחול') || allFields.includes('כח')) {
            colorCode = 'כחול';
          } else if (allFields.includes('כתום')) {
            colorCode = 'כתום';
          } else if (allFields.includes('סגול')) {
            colorCode = 'סגול';
          } else if (allFields.includes('לבן')) {
            colorCode = 'לבן';
          }
        }

        // Smart color inference based on status patterns (fallback)
        if (!colorCode && statusRaw) {
          const status = statusRaw.toLowerCase().trim();
          if (status.includes('נסגר') || status.includes('נמכר') || status.includes('עסקה')) {
            colorCode = 'ירוק'; // Green for closed deals
          } else if (status.includes('תואם') || status.includes('במעקב') || agentName) {
            colorCode = 'צהוב'; // Yellow for matched/in progress
          } else if (status.includes('לא תואם') || status.includes('לא רצה') || status.includes('אין מענה')) {
            colorCode = 'אדום'; // Red for rejected/no contact
          }
        }

        // Determine relevance status
        let relevanceStatus = 'ממתין לבדיקה';
        if (assignedAgentId) {
          relevanceStatus = 'רלוונטי';
        } else if (mappedStatus === 'לא תואם' && (statusRaw?.includes('לא רצה') || statusRaw?.includes('לא מעוניין'))) {
          relevanceStatus = 'לא רלוונטי';
        }

        const lead = {
          lead_name: customerName.trim(),
          phone: formattedPhone,
          email: null, // Not provided in CSV
          source: 'Other' as const,
          relevance_status: relevanceStatus,
          status: mappedStatus,
          assigned_agent_id: assignedAgentId,
          meeting_date: meetingDate,
          agent_notes: statusRaw ? statusRaw.trim() : null,
          color_code: colorCode
        };

        leads.push(lead);

      } catch (error) {
        errors.push(`Row ${i + 1}: ${error}`);
      }
    }

    if (leads.length === 0) {
      return NextResponse.json({
        error: 'No valid leads found in CSV',
        errors
      }, { status: 400 });
    }

    // Check for existing leads by phone number to prevent duplicates
    const phoneNumbers = leads.map(lead => lead.phone);
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('phone')
      .in('phone', phoneNumbers);

    const existingPhones = new Set(existingLeads?.map(lead => lead.phone) || []);

    // Filter out leads that already exist
    const newLeads = leads.filter(lead => !existingPhones.has(lead.phone));
    const duplicateCount = leads.length - newLeads.length;

    if (newLeads.length === 0) {
      return NextResponse.json({
        success: false,
        error: `כל הלידים (${duplicateCount}) כבר קיימים במערכת`,
        imported: 0,
        total: leads.length,
        duplicates: duplicateCount
      });
    }

    // Insert only new leads into database
    const { data: insertedLeads, error: insertError } = await supabase
      .from('leads')
      .insert(newLeads)
      .select();

    if (insertError) {
      return NextResponse.json({
        error: 'Database error',
        details: insertError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imported: insertedLeads?.length || 0,
      total: leads.length,
      duplicates: duplicateCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({
      error: 'Failed to process CSV file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}