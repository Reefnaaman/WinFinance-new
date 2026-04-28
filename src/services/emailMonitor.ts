import Imap from 'imap'
import { simpleParser } from 'mailparser'
import { createClient } from '@supabase/supabase-js'
import { DuplicatePreventionService } from './duplicatePreventionService'
import { parseLeadEmail, type ParsedLead as SharedParsedLead } from '@/lib/leadEmailParser'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

interface EmailSettings {
  id: string
  email_host: string
  email_port: number
  email_username: string
  email_password: string
  email_secure: boolean
  monitored_email_addresses: string[]
  email_enabled: boolean
  last_check_date?: string
}

type ParsedLead = SharedParsedLead

export class EmailMonitor {
  private imap: Imap | null = null
  private settings: EmailSettings | null = null

  constructor() {
    this.loadSettings()
  }

  private async loadSettings(): Promise<boolean> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .single()

      if (error || !data) {
        console.log('No email settings found')
        return false
      }

      this.settings = data
      return true
    } catch (error) {
      console.error('Error loading email settings:', error)
      return false
    }
  }

  private createImapConnection(): Imap {
    if (!this.settings) {
      throw new Error('Email settings not loaded')
    }

    return new Imap({
      user: this.settings.email_username,
      password: this.settings.email_password,
      host: this.settings.email_host,
      port: this.settings.email_port,
      tls: this.settings.email_secure,
      tlsOptions: {
        rejectUnauthorized: false
      }
    })
  }

  private parseEmailContent(text: string): ParsedLead | null {
    return parseLeadEmail(text)
  }

  private async createLeadFromParsedData(parsedLead: ParsedLead, originalEmail: any): Promise<string | null> {
    try {
      // Use DuplicatePreventionService to check and create lead safely
      const duplicateService = new DuplicatePreventionService()

      const leadData = {
        lead_name: parsedLead.lead_name,
        phone: parsedLead.phone,
        email: originalEmail.from?.value?.[0]?.address || undefined
      }

      // Check for duplicates first
      const duplicateCheck = await duplicateService.isDuplicate(leadData)

      if (duplicateCheck.isDuplicate) {
        console.log(`⚠️ Duplicate detected via EmailMonitor: ${parsedLead.lead_name} (${parsedLead.phone})`)
        console.log(`   Reason: ${duplicateCheck.reason}`)
        console.log(`   Existing lead ID: ${duplicateCheck.existingLead?.id}`)
        // Return the existing lead ID so it gets logged as processed
        return duplicateCheck.existingLead?.id || null
      }

      // Create the lead using duplicate prevention service
      const result = await duplicateService.createLeadSafely(
        leadData,
        'Email',  // uppercase for consistency with existing data
        'email_monitor'
      )

      if (result.success && result.lead) {
        // Persist the consolidated notes built by the shared parser
        if (parsedLead.notes) {
          const supabase = getSupabaseClient()
          await supabase
            .from('leads')
            .update({
              agent_notes: parsedLead.notes,
              email_processed: true
            })
            .eq('id', result.lead.id)
        }

        console.log(`✅ Created lead: ${parsedLead.lead_name} (${parsedLead.phone})`)
        return result.lead.id
      }

      return null
    } catch (error) {
      console.error('Error creating lead from parsed data:', error)
      return null
    }
  }

  private async logEmailProcessing(messageId: string, senderEmail: string, subject: string, status: 'success' | 'failed' | 'skipped', leadId?: string, errorMessage?: string): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('email_processing_log')
        .insert([{
          email_message_id: messageId,
          sender_email: senderEmail,
          subject: subject || 'No Subject',
          lead_id: leadId || null,
          processing_status: status,
          error_message: errorMessage || null,
          processed_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('❌ Failed to log email processing:', error.message)
        console.error('Details:', { messageId, senderEmail, subject, status })
        // Don't throw - we still want to process the email even if logging fails
      } else {
        console.log('✅ Email processing logged successfully:', messageId)
      }
    } catch (error) {
      console.error('Error in logEmailProcessing:', error)
    }
  }

  private async isEmailAlreadyProcessed(messageId: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('email_processing_log')
        .select('id')
        .eq('email_message_id', messageId)
        .single()

      return !error && !!data
    } catch (error) {
      return false
    }
  }

  public async checkForNewEmails(): Promise<void> {
    if (!this.settings || !this.settings.email_enabled) {
      console.log('Email monitoring is disabled or not configured')
      return
    }

    return new Promise((resolve, reject) => {
      this.imap = this.createImapConnection()

      this.imap.once('ready', () => {
        console.log('📧 Connected to Gmail IMAP')

        this.imap!.openBox('INBOX', false, (err, box) => {
          if (err) {
            console.error('Error opening inbox:', err)
            return reject(err)
          }

          // Search for unseen emails from monitored addresses
          let searchCriteria: any[] = ['UNSEEN']

          // If we have specific monitored addresses, search for emails from those addresses
          if (this.settings!.monitored_email_addresses.length > 0) {
            const fromCriteria = this.settings!.monitored_email_addresses.map(email => ['FROM', email])
            searchCriteria = ['UNSEEN', ['OR', ...fromCriteria]]
          }

          this.imap!.search(searchCriteria, (err, results) => {
            if (err) {
              console.error('Error searching emails:', err)
              return reject(err)
            }

            if (!results || results.length === 0) {
              console.log('📭 No new emails found')
              this.imap!.end()
              return resolve()
            }

            console.log(`📬 Found ${results.length} new emails to process`)

            const fetch = this.imap!.fetch(results, {
              bodies: '',
              markSeen: false // Don't mark as read automatically
            })

            let processedCount = 0

            fetch.on('message', (msg, seqno) => {
              let emailData = ''

              msg.on('body', (stream, info) => {
                stream.on('data', (chunk) => {
                  emailData += chunk.toString('utf8')
                })
              })

              msg.once('end', async () => {
                try {
                  const parsed = await simpleParser(emailData)
                  const messageId = parsed.messageId || `${Date.now()}-${seqno}`
                  const senderEmail = parsed.from?.value?.[0]?.address || 'unknown'
                  const subject = parsed.subject || 'No Subject'

                  console.log(`📧 Processing email from: ${senderEmail}`)
                  console.log(`📋 Subject: ${subject}`)

                  // Check if already processed
                  if (await this.isEmailAlreadyProcessed(messageId)) {
                    console.log(`⏭️ Email ${messageId} already processed, skipping`)
                    await this.logEmailProcessing(messageId, senderEmail, subject, 'skipped')
                    processedCount++
                    return
                  }

                  const emailText = parsed.text || parsed.html || ''
                  const parsedLead = this.parseEmailContent(emailText)

                  if (parsedLead) {
                    console.log(`📋 Extracted lead data:`, parsedLead)

                    const leadId = await this.createLeadFromParsedData(parsedLead, parsed)

                    if (leadId) {
                      await this.logEmailProcessing(messageId, senderEmail, subject, 'success', leadId)

                      // Mark email as read since we successfully processed it
                      this.imap!.setFlags([seqno], ['\\Seen'], (err) => {
                        if (err) console.error('Error marking email as read:', err)
                      })
                    } else {
                      await this.logEmailProcessing(messageId, senderEmail, subject, 'failed', undefined, 'Failed to create lead in database')
                    }
                  } else {
                    console.log(`⚠️ Could not parse lead data from email: ${subject}`)
                    await this.logEmailProcessing(messageId, senderEmail, subject, 'failed', undefined, 'Could not parse required fields (name/phone)')
                  }

                  processedCount++
                } catch (error) {
                  console.error('Error processing email:', error)
                  processedCount++
                }
              })
            })

            fetch.once('end', () => {
              console.log(`✅ Finished processing ${processedCount} emails`)

              // Update last check date
              this.updateLastCheckDate()

              this.imap!.end()
              resolve()
            })

            fetch.once('error', (err) => {
              console.error('Fetch error:', err)
              this.imap!.end()
              reject(err)
            })
          })
        })
      })

      this.imap.once('error', (err: any) => {
        console.error('IMAP connection error:', err)
        reject(err)
      })

      this.imap.connect()
    })
  }

  private async updateLastCheckDate(): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      await supabase
        .from('email_settings')
        .update({
          last_check_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', this.settings!.id)
    } catch (error) {
      console.error('Error updating last check date:', error)
    }
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.loadSettings()

      if (!this.settings) {
        return { success: false, message: 'אין הגדרות אימייל' }
      }

      return new Promise((resolve) => {
        const testImap = this.createImapConnection()

        testImap.once('ready', () => {
          testImap.end()
          resolve({ success: true, message: 'חיבור למייל הצליח!' })
        })

        testImap.once('error', (err: any) => {
          resolve({ success: false, message: `שגיאה בחיבור: ${err.message}` })
        })

        testImap.connect()
      })
    } catch (error: any) {
      return { success: false, message: `שגיאה: ${error.message}` }
    }
  }

  public disconnect(): void {
    if (this.imap) {
      this.imap.end()
      this.imap = null
    }
  }
}