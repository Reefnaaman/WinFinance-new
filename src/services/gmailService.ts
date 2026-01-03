import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export class GmailService {
  private oauth2Client: OAuth2Client

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    )
  }

  async getAuthenticatedClient(userEmail: string): Promise<OAuth2Client | null> {
    try {
      const supabase = getSupabaseClient()
      // Get tokens from database
      const { data: tokenData, error } = await supabase
        .from('gmail_tokens')
        .select('*')
        .eq('user_email', userEmail)
        .single()

      if (error || !tokenData) {
        console.error('No Gmail tokens found for user:', userEmail)
        return null
      }

      // Check if token is expired
      const now = new Date()
      const tokenExpiry = new Date(tokenData.token_expiry)

      if (tokenExpiry <= now) {
        console.log('Token expired, refreshing...')
        // Token is expired, refresh it
        this.oauth2Client.setCredentials({
          refresh_token: tokenData.refresh_token
        })

        const { credentials } = await this.oauth2Client.refreshAccessToken()

        // Update tokens in database
        const newExpiry = credentials.expiry_date
          ? new Date(credentials.expiry_date).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString()

        const supabaseUpdate = getSupabaseClient()
        await supabaseUpdate
          .from('gmail_tokens')
          .update({
            access_token: credentials.access_token,
            token_expiry: newExpiry,
            updated_at: new Date().toISOString()
          })
          .eq('user_email', userEmail)

        this.oauth2Client.setCredentials(credentials)
      } else {
        // Token is still valid
        this.oauth2Client.setCredentials({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token
        })
      }

      return this.oauth2Client
    } catch (error) {
      console.error('Error getting authenticated client:', error)
      return null
    }
  }

  async listMessages(userEmail: string, query?: string) {
    const authClient = await this.getAuthenticatedClient(userEmail)
    if (!authClient) {
      throw new Error('Failed to authenticate Gmail client')
    }

    const gmail = google.gmail({ version: 'v1', auth: authClient })

    try {
      // Default query to get unread emails
      const searchQuery = query || 'is:unread'

      const response = await gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: 50
      })

      return response.data.messages || []
    } catch (error) {
      console.error('Error listing messages:', error)
      throw error
    }
  }

  async getMessage(userEmail: string, messageId: string) {
    const authClient = await this.getAuthenticatedClient(userEmail)
    if (!authClient) {
      throw new Error('Failed to authenticate Gmail client')
    }

    const gmail = google.gmail({ version: 'v1', auth: authClient })

    try {
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      })

      return response.data
    } catch (error) {
      console.error('Error getting message:', error)
      throw error
    }
  }

  async markAsRead(userEmail: string, messageId: string) {
    const authClient = await this.getAuthenticatedClient(userEmail)
    if (!authClient) {
      throw new Error('Failed to authenticate Gmail client')
    }

    const gmail = google.gmail({ version: 'v1', auth: authClient })

    try {
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      })

      return true
    } catch (error) {
      console.error('Error marking message as read:', error)
      return false
    }
  }

  parseEmailContent(message: any): { text: string; html: string; from: string; subject: string; date: string } {
    const headers = message.payload?.headers || []
    const from = headers.find((h: any) => h.name === 'From')?.value || ''
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
    const date = headers.find((h: any) => h.name === 'Date')?.value || ''

    let text = ''
    let html = ''

    // Parse message body
    const parsePartRecursive = (part: any) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text += Buffer.from(part.body.data, 'base64').toString('utf-8')
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html += Buffer.from(part.body.data, 'base64').toString('utf-8')
      }

      if (part.parts) {
        part.parts.forEach(parsePartRecursive)
      }
    }

    if (message.payload) {
      parsePartRecursive(message.payload)
    }

    return { text, html, from, subject, date }
  }

  parseLeadFromEmail(emailContent: string): any {
    // Reuse existing parsing logic
    const content = emailContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()

    // Extract שם מלא (Full name)
    const nameMatch = content.match(/שם מלא:\s*(.+)/i)
    if (!nameMatch) return null

    // Extract טלפון נייד (Mobile phone)
    const phoneMatch = content.match(/טלפון נייד:\s*(.+)/i) || content.match(/טלפון:\s*(.+)/i)
    if (!phoneMatch) return null

    const result: any = {
      lead_name: nameMatch[1].trim(),
      phone: this.cleanPhoneNumber(phoneMatch[1].trim())
    }

    // Extract email
    const emailMatch = content.match(/אימייל:\s*(.+)/i) ||
                      content.match(/מייל:\s*(.+)/i) ||
                      content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
    if (emailMatch) {
      result.email = emailMatch[1].trim()
    }

    // Extract address
    const addressMatch = content.match(/כתובת מלאה:\s*(.+)/i) || content.match(/כתובת:\s*(.+)/i)
    if (addressMatch) {
      result.address = addressMatch[1].trim()
    }

    // Extract notes
    const notes = []
    const notesMatch = content.match(/הערות:\s*(.+)/i)
    if (notesMatch) {
      notes.push(notesMatch[1].trim())
    }

    const campaignMatch = content.match(/התקבל ליד חדש מקמפיין\s*-\s*(.+)/i)
    if (campaignMatch) {
      notes.push(`קמפיין: ${campaignMatch[1].trim()}`)
    }

    const operatorMatch = content.match(/בעזרת טלפנית בשם\s*-\s*(.+)/i)
    if (operatorMatch) {
      notes.push(`טלפנית: ${operatorMatch[1].trim()}`)
    }

    if (addressMatch && result.address) {
      notes.push(`כתובת: ${result.address}`)
    }

    if (notes.length > 0) {
      result.notes = notes.join('\n')
    }

    return result
  }

  private cleanPhoneNumber(phone: string): string {
    if (!phone) return phone

    // Remove all non-digits
    const digits = phone.replace(/[^\d]/g, '')

    // Ensure Israeli format (start with 0)
    if (digits.length === 9 && !digits.startsWith('0')) {
      return '0' + digits
    }

    return digits.length >= 9 ? digits : phone
  }
}