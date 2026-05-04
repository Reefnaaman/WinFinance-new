export interface ParsedLead {
  lead_name: string
  phone: string
  email?: string
  address?: string
  notes?: string
  source: string
}

export interface ParseLeadEmailOptions {
  sourceName?: string
}

const NEXT_FIELD_RE = /^(שם|טלפון|אימייל|מייל|כתובת|התקבל|בעזרת|גיל|תאריך לידה|מספר|ביטוח|מין|האם|סוג|כמה)/

// Known field labels and section headers in lead emails. Used to normalize
// content so each label starts on its own line, regardless of whether the
// source email used real line breaks. Without this, regex captures like
// (.+) greedily eat everything until end of line — pulling adjacent field
// values into the previous field.
const KNOWN_BOUNDARIES = [
  'שם מלא:', 'שם:',
  'טלפון נייד:', 'טלפון:',
  'גיל:',
  'תאריך לידה:',
  'מספר תעודת זהות:', 'מספר ליד:',
  'ת.ז.:', 'ת.ז:',
  'ביטוח מבוקש:',
  'מין:',
  'האם מעשן:',
  'סוג כיסויי הבריאות:',
  'כמה אתה משלם בחודש?:', 'כמה אתה משלם בחודש:',
  'אימייל:', 'מייל:',
  'כתובת מלאה:', 'כתובת:',
  'הערות:',
  'פרטי ליד', 'ביטוחים', 'הלוואות', 'שאלון ביטוח',
] as const

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
}

function insertFieldBoundaries(content: string): string {
  // Sort longest-first so the longer label wins when one is a prefix of another
  // (e.g. 'שם מלא:' is matched/replaced before 'שם:' so the engine doesn't
  // pre-emptively split inside the longer label).
  const sorted = [...KNOWN_BOUNDARIES].sort((a, b) => b.length - a.length)
  let out = content
  for (const label of sorted) {
    const re = new RegExp(`(?<=\\S)\\s*(?=${escapeRegex(label)})`, 'g')
    out = out.replace(re, '\n')
  }
  return out
}

export function parseLeadEmail(
  emailContent: string,
  opts: ParseLeadEmailOptions = {}
): ParsedLead | null {
  if (!emailContent) return null

  const stripped = stripHtml(emailContent)
  const normalized = stripped.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  const content = insertFieldBoundaries(normalized)

  // Required: name. Try the legacy "שם מלא:" first, then the new Leadim "שם:".
  const nameMatch =
    content.match(/שם מלא:\s*(.+)/i) || content.match(/שם:\s*(.+)/i)
  if (!nameMatch) return null
  const lead_name = nameMatch[1].trim()
  if (isInvalidValue(lead_name)) return null

  // Required: phone. Try "טלפון נייד:" first, then the new Leadim "טלפון:".
  const phoneMatch =
    content.match(/טלפון נייד:\s*(.+)/i) || content.match(/טלפון:\s*(.+)/i)
  if (!phoneMatch) return null
  const rawPhone = phoneMatch[1].trim()
  if (isInvalidValue(rawPhone)) return null
  const phone = cleanPhoneNumber(rawPhone)
  const digitsOnly = phone.replace(/\D/g, '')
  if (digitsOnly.length < 9) return null

  const result: ParsedLead = {
    lead_name,
    phone,
    source: opts.sourceName || 'email',
  }

  const emailMatch =
    content.match(/אימייל:\s*(.+)/i) ||
    content.match(/מייל:\s*(.+)/i) ||
    content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
  if (emailMatch) {
    const candidate = emailMatch[1].trim()
    if (candidate.includes('@')) {
      result.email = candidate
    }
  }

  const addressMatch =
    content.match(/כתובת מלאה:\s*(.+)/i) || content.match(/כתובת:\s*(.+)/i)
  if (addressMatch) {
    result.address = addressMatch[1].trim()
  }

  const notes: string[] = []

  if (opts.sourceName && opts.sourceName !== 'Email' && opts.sourceName !== 'email') {
    notes.push(`מקור: ${opts.sourceName}`)
  }

  const providerIdMatch = content.match(/מספר ליד:\s*(\S+)/i)
  if (providerIdMatch) notes.push(`מספר ליד: ${providerIdMatch[1].trim()}`)

  const ageMatch = content.match(/גיל:\s*(.+)/i)
  if (ageMatch) notes.push(`גיל: ${ageMatch[1].trim()}`)

  const dobMatch = content.match(/תאריך לידה:\s*(.+)/i)
  if (dobMatch) notes.push(`תאריך לידה: ${dobMatch[1].trim()}`)

  const idMatch =
    content.match(/מספר תעודת זהות:\s*(.+)/i) ||
    content.match(/ת\.?\s?ז\.?:\s*(.+)/i)
  if (idMatch) notes.push(`ת.ז.: ${idMatch[1].trim()}`)

  const insuranceTypeMatch = content.match(/ביטוח מבוקש:\s*(.+)/i)
  if (insuranceTypeMatch) notes.push(`ביטוח מבוקש: ${insuranceTypeMatch[1].trim()}`)

  const genderMatch = content.match(/מין:\s*(.+)/i)
  if (genderMatch) notes.push(`מין: ${genderMatch[1].trim()}`)

  const smokerMatch = content.match(/האם מעשן:\s*(.+)/i)
  if (smokerMatch) notes.push(`מעשן: ${smokerMatch[1].trim()}`)

  const coverageMatch = content.match(/סוג כיסויי הבריאות:\s*(.+)/i)
  if (coverageMatch) notes.push(`כיסויי בריאות: ${coverageMatch[1].trim()}`)

  const monthlyMatch = content.match(/כמה אתה משלם בחודש\??:\s*(.+)/i)
  if (monthlyMatch) notes.push(`תשלום חודשי: ${monthlyMatch[1].trim()}`)

  if (result.address) notes.push(`כתובת: ${result.address}`)

  const campaignMatch = content.match(/התקבל ליד חדש מקמפיין\s*-\s*(.+)/i)
  if (campaignMatch) notes.push(`קמפיין: ${campaignMatch[1].trim()}`)

  const operatorMatch = content.match(/בעזרת טלפנית בשם\s*-\s*(.+)/i)
  if (operatorMatch) notes.push(`טלפנית: ${operatorMatch[1].trim()}`)

  const freeNotes = extractFreeTextNotes(content)
  if (freeNotes) notes.push(freeNotes)

  if (notes.length > 0) {
    result.notes = notes.join('\n')
  }

  return result
}

export function cleanPhoneNumber(phone: string): string {
  if (!phone) return phone
  const digits = phone.replace(/[^\d]/g, '')
  if (digits.length === 9 && !digits.startsWith('0')) return '0' + digits
  return digits.length >= 9 ? digits : phone
}

function isInvalidValue(value: string): boolean {
  if (!value) return true
  if (value.includes('<') || value.includes('>')) return true
  if (value === 'br' || value === 'br /' || value === 'br/') return true
  return false
}

function extractFreeTextNotes(content: string): string {
  const idx = content.search(/הערות:/i)
  if (idx === -1) return ''
  const after = content.substring(idx + 'הערות:'.length).trim()
  if (!after) return ''
  const lines = after.split('\n')
  const collected: string[] = []
  for (const line of lines) {
    if (NEXT_FIELD_RE.test(line.trim())) break
    collected.push(line)
  }
  return collected.join('\n').trim()
}

function stripHtml(content: string): string {
  if (!content.includes('<') || !content.includes('>')) return content
  let stripped = content
  stripped = stripped.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  stripped = stripped.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  stripped = stripped.replace(/<br\s*\/?>/gi, '\n')
  stripped = stripped.replace(/<\/?(p|div|tr|td|th|li)[^>]*>/gi, '\n')
  stripped = stripped.replace(/<[^>]+>/g, '')
  stripped = stripped
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
  return stripped
}
