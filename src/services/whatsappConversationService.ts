import { createClient } from '@supabase/supabase-js';
import { WhatsAppService } from './whatsappService';
import { AgentSchedulingService } from './agentSchedulingService';
import { GoogleCalendarService } from './googleCalendarService';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// The WhatsApp template names (must be approved by Meta)
// Different templates for initial outreach vs follow-ups
const TEMPLATE_NAME = 'lead_scheduling_intro';
const FOLLOW_UP_TEMPLATE_NAMES: Record<number, string> = {
  1: 'lead_scheduling_intro',        // 1st attempt: standard intro
  2: 'lead_scheduling_reminder',     // 2nd attempt: gentle reminder (fallback to intro if not approved)
  3: 'lead_scheduling_last_chance',  // 3rd attempt: last chance (fallback to intro if not approved)
};

// Re-outreach configuration
const MAX_OUTREACH_ATTEMPTS = 3;
// Days to wait before each re-outreach attempt (after no reply)
const REOUTREACH_DELAY_DAYS: Record<number, number> = {
  1: 1,  // After 1st no-reply: wait 1 working day
  2: 2,  // After 2nd no-reply: wait 2 working days
};

// Claude API configuration
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class WhatsAppConversationService {
  private _supabase: ReturnType<typeof getSupabaseClient> | null = null;
  private _whatsapp: WhatsAppService | null = null;
  private _scheduling: AgentSchedulingService | null = null;
  private _calendar: GoogleCalendarService | null = null;

  private get supabase() {
    if (!this._supabase) this._supabase = getSupabaseClient();
    return this._supabase;
  }
  private get whatsapp() {
    if (!this._whatsapp) this._whatsapp = new WhatsAppService();
    return this._whatsapp;
  }
  private get scheduling() {
    if (!this._scheduling) this._scheduling = new AgentSchedulingService();
    return this._scheduling;
  }
  private get calendar() {
    if (!this._calendar) this._calendar = new GoogleCalendarService();
    return this._calendar;
  }

  /**
   * Process a batch of leads from the outreach queue
   * Called by the cron job at 9:34 and 14:20 Israel time
   */
  async processBatch(batchWindow: 'morning' | 'afternoon'): Promise<{
    processed: number;
    sent: number;
    skipped: number;
    errors: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const stats = { processed: 0, sent: 0, skipped: 0, errors: 0 };

    // Get pending items from the queue for today's batch
    const { data: pendingItems } = await this.supabase
      .from('whatsapp_outreach_queue')
      .select('*')
      .eq('status', 'pending')
      .eq('scheduled_date', today)
      .eq('scheduled_batch', batchWindow);

    // Also retry previously failed items (max 3 attempts)
    const MAX_RETRY_ATTEMPTS = 3;
    const { data: failedItems } = await this.supabase
      .from('whatsapp_outreach_queue')
      .select('*')
      .eq('status', 'failed')
      .eq('scheduled_date', today)
      .eq('scheduled_batch', batchWindow)
      .lt('attempts', MAX_RETRY_ATTEMPTS);

    const queueItems = [...(pendingItems || []), ...(failedItems || [])];

    if (queueItems.length === 0) {
      console.log(`No items in queue for ${batchWindow} batch on ${today}`);
      return stats;
    }

    for (let i = 0; i < queueItems.length; i++) {
      const item = queueItems[i];
      stats.processed++;

      // Rate limit: 200ms delay between sends to avoid hitting Meta API limits
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      try {
        // Mark as processing
        await this.supabase
          .from('whatsapp_outreach_queue')
          .update({ status: 'processing' })
          .eq('id', item.id);

        // Check if phone is on the opt-out blocklist (never contact again)
        const isOptedOut = await this.isPhoneOptedOut(item.phone);
        if (isOptedOut) {
          await this.supabase
            .from('whatsapp_outreach_queue')
            .update({
              status: 'skipped',
              skip_reason: 'phone_opted_out',
              processed_at: new Date().toISOString(),
            })
            .eq('id', item.id);
          stats.skipped++;
          continue;
        }

        // Check if there's already an active conversation for this lead
        const { data: existingConv } = await this.supabase
          .from('whatsapp_conversations')
          .select('id, status')
          .eq('lead_id', item.lead_id)
          .not('status', 'in', '("error","no_reply")')
          .single();

        if (existingConv) {
          await this.supabase
            .from('whatsapp_outreach_queue')
            .update({
              status: 'skipped',
              skip_reason: 'active_conversation_exists',
              processed_at: new Date().toISOString(),
            })
            .eq('id', item.id);
          stats.skipped++;
          continue;
        }

        // Determine outreach attempt number from previous conversations for this lead
        const { data: prevConvs } = await this.supabase
          .from('whatsapp_conversations')
          .select('outreach_attempt')
          .eq('lead_id', item.lead_id)
          .eq('status', 'no_reply')
          .order('outreach_attempt', { ascending: false })
          .limit(1);

        const outreachAttempt = prevConvs && prevConvs.length > 0
          ? ((prevConvs[0].outreach_attempt as number) || 0) + 1
          : 1;

        // Create a new conversation
        const { data: conversation, error: convError } = await this.supabase
          .from('whatsapp_conversations')
          .insert({
            lead_id: item.lead_id,
            phone: item.phone,
            status: 'queued',
            batch_window: batchWindow,
            outreach_attempt: outreachAttempt,
            ai_context: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (convError || !conversation) {
          throw new Error(`Failed to create conversation: ${convError?.message}`);
        }

        // Select the template based on outreach attempt
        // Falls back to the base template if attempt-specific template isn't approved
        const templateName = FOLLOW_UP_TEMPLATE_NAMES[outreachAttempt] || TEMPLATE_NAME;

        // Send the template message
        const result = await this.whatsapp.sendTemplateMessage(
          item.phone,
          templateName,
          'he',
          [
            {
              type: 'body',
              parameters: [{ type: 'text', text: item.lead_name }],
            },
          ]
        );

        if (result.success) {
          // Update conversation status + initialize last_message_at for timeout tracking
          const templateSentAt = new Date().toISOString();
          await this.supabase
            .from('whatsapp_conversations')
            .update({
              status: 'template_sent',
              template_sent_at: templateSentAt,
              last_message_at: templateSentAt,
              updated_at: templateSentAt,
            })
            .eq('id', conversation.id);

          // Log the outbound message
          await this.whatsapp.logMessage(
            conversation.id,
            'outbound',
            `[Template: ${TEMPLATE_NAME}] שלום ${item.lead_name}, פנית אלינו בנושא ביטוח. נשמח לתאם שיחת ייעוץ קצרה. מתי יהיה לך נוח?`,
            'template',
            result.messageId,
            'sent'
          );

          // Mark queue item as sent
          await this.supabase
            .from('whatsapp_outreach_queue')
            .update({
              status: 'sent',
              processed_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          stats.sent++;
        } else if (result.error?.startsWith('RATE_LIMITED')) {
          // Meta error 131049: per-user marketing template limit
          // Skip this user for now, reschedule for afternoon/next day
          await this.supabase
            .from('whatsapp_conversations')
            .update({ status: 'error', error_message: result.error, updated_at: new Date().toISOString() })
            .eq('id', conversation.id);

          await this.supabase
            .from('whatsapp_outreach_queue')
            .update({
              status: 'skipped',
              skip_reason: 'meta_rate_limited_131049',
              processed_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          console.log(`Rate limited for phone ${item.phone}, skipping`);
          stats.skipped++;
        } else {
          throw new Error(result.error || 'Failed to send template message');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing queue item ${item.id}:`, errorMsg);

        await this.supabase
          .from('whatsapp_outreach_queue')
          .update({
            status: 'failed',
            skip_reason: errorMsg,
            attempts: (item.attempts || 0) + 1,
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        stats.errors++;
      }
    }

    return stats;
  }

  /**
   * Handle an incoming WhatsApp message from a lead
   * This is the core AI conversation engine
   */
  async handleIncomingMessage(
    phone: string,
    messageText: string,
    whatsappMessageId: string,
    messageType: string = 'text'
  ): Promise<void> {
    // 1. Find the active conversation for this phone number
    const { data: conversation, error: convError } = await this.supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('phone', phone)
      .in('status', ['template_sent', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (convError || !conversation) {
      console.log(`No active conversation found for phone: ${phone}`);
      return;
    }

    // 2. Log the incoming message
    await this.whatsapp.logMessage(
      conversation.id,
      'inbound',
      messageText,
      messageType,
      whatsappMessageId,
      'delivered'
    );

    // 3. Mark as read
    await this.whatsapp.markAsRead(whatsappMessageId);

    // 3.5. HARD-CODED OPT-OUT CHECK — runs BEFORE AI, deterministic
    // Per Meta WhatsApp Business Policy: must respect all opt-out requests
    if (this.isOptOutMessage(messageText)) {
      await this.handleOptOut(conversation, phone);
      return;
    }

    // 4. Update conversation status to active if it was template_sent
    if (conversation.status === 'template_sent') {
      await this.supabase
        .from('whatsapp_conversations')
        .update({
          status: 'active',
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversation.id);
    }

    // 5. Handle button/interactive replies (slot selection)
    const slotSelection = this.extractSlotSelection(messageText, messageType);
    if (slotSelection) {
      await this.handleSlotSelection(conversation, slotSelection);
      return;
    }

    // 6. Generate AI response using Claude
    const aiResponse = await this.generateAIResponse(conversation, messageText);

    if (aiResponse.action === 'offer_slots') {
      // Send time slot list
      const slots = await this.scheduling.getSlotsForWhatsApp(10);
      if (slots.length > 0) {
        const result = await this.whatsapp.sendListMessage(
          phone,
          aiResponse.message,
          'בחר מועד',
          slots
        );

        await this.whatsapp.logMessage(
          conversation.id,
          'outbound',
          aiResponse.message + ' [+ slot list]',
          'interactive',
          result.messageId,
          result.success ? 'sent' : 'failed'
        );
      } else {
        // No available slots - send text message
        const noSlotsMsg = 'מצטערים, אין כרגע מועדים פנויים. ניצור איתך קשר בהקדם לתיאום.';
        const result = await this.whatsapp.sendTextMessage(phone, noSlotsMsg);
        await this.whatsapp.logMessage(
          conversation.id,
          'outbound',
          noSlotsMsg,
          'text',
          result.messageId,
          result.success ? 'sent' : 'failed'
        );
      }
    } else if (aiResponse.action === 'not_interested') {
      // Lead is not interested
      await this.supabase
        .from('whatsapp_conversations')
        .update({
          status: 'not_interested',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversation.id);

      // Update lead status
      await this.supabase
        .from('leads')
        .update({
          relevance_status: 'לא רלוונטי',
          status: 'לא רלוונטי',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversation.lead_id);

      const result = await this.whatsapp.sendTextMessage(phone, aiResponse.message);
      await this.whatsapp.logMessage(
        conversation.id,
        'outbound',
        aiResponse.message,
        'text',
        result.messageId,
        result.success ? 'sent' : 'failed'
      );
    } else if (aiResponse.action === 'needs_human') {
      // Escalate to human agent - mark conversation for manual review
      await this.supabase
        .from('whatsapp_conversations')
        .update({
          status: 'needs_human',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversation.id);

      // Update lead relevance so coordinators can see it needs attention
      await this.supabase
        .from('leads')
        .update({
          relevance_status: 'במעקב',
          agent_notes: `[WhatsApp] נדרש טיפול אנושי: ${messageText}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversation.lead_id);

      const result = await this.whatsapp.sendTextMessage(phone, aiResponse.message);
      await this.whatsapp.logMessage(
        conversation.id,
        'outbound',
        aiResponse.message,
        'text',
        result.messageId,
        result.success ? 'sent' : 'failed'
      );
    } else {
      // Regular conversational response
      const result = await this.whatsapp.sendTextMessage(phone, aiResponse.message);
      await this.whatsapp.logMessage(
        conversation.id,
        'outbound',
        aiResponse.message,
        'text',
        result.messageId,
        result.success ? 'sent' : 'failed'
      );
    }

    // Update conversation context and last_message_at
    const currentContext = (conversation.ai_context as ConversationMessage[]) || [];
    currentContext.push(
      { role: 'user', content: messageText },
      { role: 'assistant', content: aiResponse.message }
    );

    await this.supabase
      .from('whatsapp_conversations')
      .update({
        ai_context: currentContext,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation.id);
  }

  /**
   * Handle when a lead selects a specific time slot
   */
  private async handleSlotSelection(
    conversation: Record<string, unknown>,
    slotId: string
  ): Promise<void> {
    const phone = conversation.phone as string;
    const leadId = conversation.lead_id as string;
    const conversationId = conversation.id as string;

    const parsed = this.scheduling.parseSlotId(slotId);
    if (!parsed) {
      const msg = 'לא הצלחנו לזהות את הבחירה. אנא בחר שוב מהרשימה.';
      const result = await this.whatsapp.sendTextMessage(phone, msg);
      await this.whatsapp.logMessage(conversationId, 'outbound', msg, 'text', result.messageId);
      return;
    }

    // Schedule the meeting
    const scheduleResult = await this.scheduling.scheduleMeeting(
      leadId,
      conversationId,
      parsed.date,
      parsed.startTime
    );

    if (scheduleResult.success && scheduleResult.slot) {
      // Send confirmation to lead
      const confirmMsg =
        `נהדר! הפגישה נקבעה:\n` +
        `${scheduleResult.slot.displayHebrew}\n` +
        `הנציג שלנו ${scheduleResult.agentName} ייצור איתך קשר.\n` +
        `תודה ונתראה!`;

      const result = await this.whatsapp.sendTextMessage(phone, confirmMsg);
      await this.whatsapp.logMessage(
        conversationId,
        'outbound',
        confirmMsg,
        'text',
        result.messageId,
        result.success ? 'sent' : 'failed'
      );

      // Create Google Calendar event for the agent
      if (scheduleResult.agentId && scheduleResult.slotId) {
        try {
          // Get agent details
          const { data: agent } = await this.supabase
            .from('agents')
            .select('name, email')
            .eq('id', scheduleResult.agentId)
            .single();

          // Get lead details
          const { data: lead } = await this.supabase
            .from('leads')
            .select('lead_name, phone, email')
            .eq('id', leadId)
            .single();

          if (agent && lead) {
            const calendarEventId = await this.calendar.createMeetingEvent({
              agentEmail: agent.email,
              agentName: agent.name,
              leadName: lead.lead_name,
              leadPhone: lead.phone,
              leadEmail: lead.email || undefined,
              startTime: scheduleResult.slot.startISO,
              endTime: scheduleResult.slot.endISO,
            });

            if (calendarEventId) {
              await this.supabase
                .from('agent_meeting_slots')
                .update({ google_calendar_event_id: calendarEventId })
                .eq('id', scheduleResult.slotId);
            }
          }
        } catch (calError) {
          console.error('Failed to create calendar event:', calError);
          // Non-blocking - meeting is still scheduled even if calendar fails
        }
      }
    } else {
      // Slot no longer available
      const errorMsg = scheduleResult.error || 'המועד כבר לא זמין.';
      const slots = await this.scheduling.getSlotsForWhatsApp(10);

      if (slots.length > 0) {
        const result = await this.whatsapp.sendListMessage(
          phone,
          `${errorMsg} אנא בחר מועד אחר:`,
          'בחר מועד',
          slots
        );
        await this.whatsapp.logMessage(
          conversationId,
          'outbound',
          `${errorMsg} [+ updated slot list]`,
          'interactive',
          result.messageId
        );
      } else {
        const noSlotsMsg = 'מצטערים, אין כרגע מועדים זמינים. ניצור איתך קשר בהקדם.';
        const result = await this.whatsapp.sendTextMessage(phone, noSlotsMsg);
        await this.whatsapp.logMessage(conversationId, 'outbound', noSlotsMsg, 'text', result.messageId);
      }
    }
  }

  /**
   * Extract slot selection from interactive replies
   */
  private extractSlotSelection(
    messageText: string,
    messageType: string
  ): string | null {
    // Check if the message is a list reply with a slot ID
    if (messageType === 'interactive' || messageText.startsWith('slot_')) {
      const match = messageText.match(/slot_\d{4}-\d{2}-\d{2}_\d{4}/);
      return match ? match[0] : null;
    }
    return null;
  }

  /**
   * Generate an AI response using Claude API
   */
  private async generateAIResponse(
    conversation: Record<string, unknown>,
    userMessage: string
  ): Promise<{ message: string; action: 'offer_slots' | 'not_interested' | 'needs_human' | 'continue' }> {
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicApiKey) {
      console.warn('ANTHROPIC_API_KEY not configured, using fallback responses');
      return this.getFallbackResponse(userMessage);
    }

    const conversationHistory = (conversation.ai_context as ConversationMessage[]) || [];

    const systemPrompt = `אתה נציג שירות לקוחות של סוכנות ביטוח פלג. התפקיד שלך הוא לתאם פגישת ייעוץ ביטוח קצרה (30 דקות) עם לקוח פוטנציאלי.

כללים חשובים:
1. דבר בעברית בלבד
2. היה ידידותי, מקצועי וקצר
3. המטרה שלך: לתאם פגישה. נסה להגיע לתיאום מועד תוך 2-3 הודעות
4. שעות עבודה: ימים א'-ה', 9:00-19:00
5. אם הלקוח מעוניין - ענה עם JSON: {"action": "offer_slots", "message": "הודעה ללקוח"}
6. אם הלקוח לא מעוניין בבירור - ענה עם JSON: {"action": "not_interested", "message": "הודעת פרידה מנומסת"}
7. אם הלקוח שואל שאלה מורכבת, מתלונן, מבקש מחירים מיוחדים, או שהשיחה חורגת מתיאום פגישה - ענה עם JSON: {"action": "needs_human", "message": "הודעה ללקוח שנציג אנושי ייצור קשר בהקדם"}
8. אחרת - ענה עם JSON: {"action": "continue", "message": "תשובה ללקוח"}
9. אל תציע מועדים ספציפיים - המערכת תציג את הזמינות
10. אם הלקוח שואל מי אתה, אמור שאתה נציג דיגיטלי של סוכנות ביטוח פלג
11. ההודעות צריכות להיות קצרות ותכליתיות - זה ווטסאפ, לא אימייל

ענה תמיד ב-JSON בלבד, בפורמט: {"action": "offer_slots" | "not_interested" | "needs_human" | "continue", "message": "הטקסט"}`;

    const messages = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    try {
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 300,
          system: systemPrompt,
          messages,
        }),
      });

      if (!response.ok) {
        console.error('Claude API error:', response.status, await response.text());
        return this.getFallbackResponse(userMessage);
      }

      const data = await response.json();
      const aiText = data?.content?.[0]?.text || '';

      // Parse the JSON response from Claude
      try {
        const parsed = JSON.parse(aiText);
        return {
          message: parsed.message || 'מצטער, לא הבנתי. האם תרצה לתאם פגישת ייעוץ?',
          action: parsed.action || 'continue',
        };
      } catch {
        // If Claude didn't return valid JSON, extract the text and default to continue
        const cleanText = aiText.replace(/```json\n?|\n?```/g, '').trim();
        try {
          const parsed = JSON.parse(cleanText);
          return { message: parsed.message, action: parsed.action || 'continue' };
        } catch {
          return { message: aiText, action: 'continue' };
        }
      }
    } catch (error) {
      console.error('Error calling Claude API:', error);
      return this.getFallbackResponse(userMessage);
    }
  }

  /**
   * Fallback responses when Claude API is not available
   */
  private getFallbackResponse(
    userMessage: string
  ): { message: string; action: 'offer_slots' | 'not_interested' | 'needs_human' | 'continue' } {
    const lowerMsg = userMessage.toLowerCase();

    // Check for positive intent
    const positiveKeywords = ['כן', 'בטח', 'אשמח', 'מעוניין', 'מתאים', 'בוא', 'ok', 'yes', 'sure'];
    if (positiveKeywords.some((kw) => lowerMsg.includes(kw))) {
      return {
        message: 'מעולה! בוא נמצא מועד שמתאים לך. בחר מהמועדים הזמינים:',
        action: 'offer_slots',
      };
    }

    // Check for negative intent
    const negativeKeywords = ['לא', 'לא מעוניין', 'לא רוצה', 'תפסיקו', 'הסירו', 'no', 'stop'];
    if (negativeKeywords.some((kw) => lowerMsg.includes(kw))) {
      return {
        message: 'תודה על ההתייחסות. אם תשנה את דעתך, אנחנו כאן. שיהיה לך יום טוב!',
        action: 'not_interested',
      };
    }

    // Default: try to steer toward scheduling
    return {
      message: 'שלום! אנחנו מסוכנות ביטוח פלג. נשמח לתאם שיחת ייעוץ קצרה (30 דקות) כדי לבדוק איך נוכל לעזור. מתי יהיה לך נוח?',
      action: 'continue',
    };
  }

  // ─── Opt-out handling ─────────────────────────────────────────

  /**
   * Hard-coded opt-out keyword detection.
   * This runs BEFORE the AI to ensure opt-outs are always respected,
   * regardless of AI model behavior.
   */
  private isOptOutMessage(messageText: string): boolean {
    const lowerMsg = messageText.toLowerCase().trim();
    // Hebrew opt-out phrases
    const hebrewOptOut = [
      'תפסיקו', 'הסירו', 'הסירו אותי', 'בקשה להסרה', 'הסרה',
      'אל תשלחו', 'תמחקו אותי', 'אני לא מעוניין יותר',
    ];
    // English opt-out phrases
    const englishOptOut = ['stop', 'unsubscribe', 'opt out', 'opt-out', 'remove me'];

    return (
      hebrewOptOut.some((kw) => lowerMsg.includes(kw)) ||
      englishOptOut.some((kw) => lowerMsg.includes(kw))
    );
  }

  /**
   * Handle an opt-out request:
   * 1. Send confirmation message
   * 2. Mark conversation as opted_out
   * 3. Mark lead as not relevant
   * 4. Add phone to permanent blocklist
   */
  private async handleOptOut(
    conversation: Record<string, unknown>,
    phone: string
  ): Promise<void> {
    const conversationId = conversation.id as string;
    const leadId = conversation.lead_id as string;

    // Send opt-out confirmation (required by Meta policy)
    const confirmMsg = 'הוסרת מרשימת התפוצה שלנו. לא נשלח לך הודעות נוספות. תודה!';
    const result = await this.whatsapp.sendTextMessage(phone, confirmMsg);
    await this.whatsapp.logMessage(
      conversationId,
      'outbound',
      confirmMsg,
      'text',
      result.messageId,
      result.success ? 'sent' : 'failed'
    );

    // Mark conversation as opted_out (distinct from not_interested)
    await this.supabase
      .from('whatsapp_conversations')
      .update({
        status: 'opted_out',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    // Mark lead as not relevant
    await this.supabase
      .from('leads')
      .update({
        relevance_status: 'לא רלוונטי',
        status: 'לא רלוונטי',
        agent_notes: '[WhatsApp] הלקוח ביקש הסרה מרשימת התפוצה',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    // Add phone to permanent opt-out blocklist
    // This prevents any future outreach to this number
    await this.supabase.from('whatsapp_opt_out').upsert(
      {
        phone,
        lead_id: leadId,
        opted_out_at: new Date().toISOString(),
      },
      { onConflict: 'phone' }
    );

    console.log(`Phone ${phone} opted out and added to blocklist`);
  }

  /**
   * Check if a phone number is on the opt-out blocklist
   */
  async isPhoneOptedOut(phone: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('whatsapp_opt_out')
      .select('id')
      .eq('phone', phone)
      .limit(1);

    return (data && data.length > 0) || false;
  }

  /**
   * Mark conversations with no reply after 24h as timed out.
   * If the lead hasn't been contacted MAX_OUTREACH_ATTEMPTS times,
   * automatically re-queue for another outreach attempt.
   * After max attempts, mark the lead as cold.
   */
  async markTimedOutConversations(): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: timedOut, error } = await this.supabase
      .from('whatsapp_conversations')
      .update({
        status: 'no_reply',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('status', ['template_sent', 'active'])
      .lt('last_message_at', twentyFourHoursAgo)
      .select('id, lead_id, phone, outreach_attempt');

    if (error) {
      console.error('Error marking timed out conversations:', error);
      return 0;
    }

    if (timedOut && timedOut.length > 0) {
      for (const conv of timedOut) {
        const attempt = (conv.outreach_attempt as number) || 1;

        if (attempt < MAX_OUTREACH_ATTEMPTS) {
          // Still have attempts left — schedule a re-outreach
          const nextAttempt = attempt + 1;
          const delayDays = REOUTREACH_DELAY_DAYS[attempt] || 1;

          // Get lead name for the queue
          const { data: lead } = await this.supabase
            .from('leads')
            .select('lead_name')
            .eq('id', conv.lead_id)
            .single();

          if (lead) {
            // Schedule re-outreach for N working days from now
            const scheduledDate = this.getWorkingDayAfter(delayDays);
            const scheduledBatch = 'morning'; // Re-outreach always in morning batch

            await this.supabase.from('whatsapp_outreach_queue').insert({
              lead_id: conv.lead_id,
              phone: conv.phone,
              lead_name: lead.lead_name,
              status: 'pending',
              scheduled_batch: scheduledBatch,
              scheduled_date: scheduledDate,
              attempts: 0,
              created_at: new Date().toISOString(),
            });

            console.log(
              `Re-queued lead ${conv.lead_id} for outreach attempt ${nextAttempt}/${MAX_OUTREACH_ATTEMPTS} on ${scheduledDate}`
            );
          }

          // Update lead: still "no answer" but we're retrying
          await this.supabase
            .from('leads')
            .update({
              relevance_status: 'אין מענה',
              status: 'אין מענה - לתאם מחדש',
              updated_at: new Date().toISOString(),
            })
            .eq('id', conv.lead_id);
        } else {
          // Max attempts reached — mark lead as cold
          await this.supabase
            .from('leads')
            .update({
              relevance_status: 'לא רלוונטי',
              status: 'לא רלוונטי',
              agent_notes: `[WhatsApp] לא ענה אחרי ${MAX_OUTREACH_ATTEMPTS} ניסיונות פנייה`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', conv.lead_id);

          console.log(
            `Lead ${conv.lead_id} marked cold after ${MAX_OUTREACH_ATTEMPTS} outreach attempts`
          );
        }
      }
    }

    return timedOut?.length || 0;
  }

  /**
   * Get a working day (Sun-Thu) that is N working days from now
   */
  private getWorkingDayAfter(workingDays: number): string {
    const WORK_DAYS = [0, 1, 2, 3, 4]; // Sunday through Thursday
    const now = new Date();
    const israelStr = now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
    const israelNow = new Date(israelStr);
    let remaining = workingDays;
    const date = new Date(israelNow);

    while (remaining > 0) {
      date.setDate(date.getDate() + 1);
      if (WORK_DAYS.includes(date.getDay())) {
        remaining--;
      }
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
