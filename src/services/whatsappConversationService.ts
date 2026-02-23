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

// The WhatsApp template name (must be approved by Meta)
const TEMPLATE_NAME = 'lead_scheduling_intro';

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
    const { data: queueItems, error } = await this.supabase
      .from('whatsapp_outreach_queue')
      .select('*')
      .eq('status', 'pending')
      .eq('scheduled_date', today)
      .eq('scheduled_batch', batchWindow);

    if (error || !queueItems || queueItems.length === 0) {
      console.log(`No items in queue for ${batchWindow} batch on ${today}`);
      return stats;
    }

    for (const item of queueItems) {
      stats.processed++;

      try {
        // Mark as processing
        await this.supabase
          .from('whatsapp_outreach_queue')
          .update({ status: 'processing' })
          .eq('id', item.id);

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

        // Create a new conversation
        const { data: conversation, error: convError } = await this.supabase
          .from('whatsapp_conversations')
          .insert({
            lead_id: item.lead_id,
            phone: item.phone,
            status: 'queued',
            batch_window: batchWindow,
            ai_context: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (convError || !conversation) {
          throw new Error(`Failed to create conversation: ${convError?.message}`);
        }

        // Send the initial template message
        const result = await this.whatsapp.sendTemplateMessage(
          item.phone,
          TEMPLATE_NAME,
          'he',
          [
            {
              type: 'body',
              parameters: [{ type: 'text', text: item.lead_name }],
            },
          ]
        );

        if (result.success) {
          // Update conversation status
          await this.supabase
            .from('whatsapp_conversations')
            .update({
              status: 'template_sent',
              template_sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
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
  ): Promise<{ message: string; action: 'offer_slots' | 'not_interested' | 'continue' }> {
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
7. אחרת - ענה עם JSON: {"action": "continue", "message": "תשובה ללקוח"}
8. אל תציע מועדים ספציפיים - המערכת תציג את הזמינות
9. אם הלקוח שואל מי אתה, אמור שאתה נציג דיגיטלי של סוכנות ביטוח פלג
10. ההודעות צריכות להיות קצרות ותכליתיות - זה ווטסאפ, לא אימייל

ענה תמיד ב-JSON בלבד, בפורמט: {"action": "offer_slots" | "not_interested" | "continue", "message": "הטקסט"}`;

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
  ): { message: string; action: 'offer_slots' | 'not_interested' | 'continue' } {
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

  /**
   * Mark conversations with no reply after 24h as timed out
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
      .select('id, lead_id');

    if (error) {
      console.error('Error marking timed out conversations:', error);
      return 0;
    }

    // Update lead status for timed out conversations
    if (timedOut && timedOut.length > 0) {
      for (const conv of timedOut) {
        await this.supabase
          .from('leads')
          .update({
            relevance_status: 'אין מענה',
            updated_at: new Date().toISOString(),
          })
          .eq('id', conv.lead_id);
      }
    }

    return timedOut?.length || 0;
  }
}
