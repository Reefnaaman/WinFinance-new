import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Meta WhatsApp Cloud API base URL
const WHATSAPP_API_BASE = 'https://graph.facebook.com/v21.0';

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  businessAccountId: string;
}

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface WebhookMessage {
  from: string; // sender phone number
  id: string; // message ID
  timestamp: string;
  type: 'text' | 'interactive' | 'button' | 'image' | 'document' | 'reaction';
  text?: { body: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  button?: { text: string; payload: string };
}

interface WebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string; message: string }>;
}

export class WhatsAppService {
  private config: WhatsAppConfig;
  private _supabase: ReturnType<typeof getSupabaseClient> | null = null;

  private get supabase() {
    if (!this._supabase) {
      this._supabase = getSupabaseClient();
    }
    return this._supabase;
  }

  constructor() {
    this.config = {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    };
  }

  isConfigured(): boolean {
    return !!(
      this.config.phoneNumberId &&
      this.config.accessToken &&
      this.config.verifyToken
    );
  }

  /**
   * Send a template message (required for first outbound message)
   * Template must be pre-approved by Meta
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'he',
    components?: Array<{
      type: 'header' | 'body' | 'button';
      parameters: Array<{ type: 'text'; text: string }>;
    }>
  ): Promise<SendMessageResult> {
    const phone = this.formatPhoneNumber(to);

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components ? { components } : {}),
      },
    };

    return this.sendRequest(payload);
  }

  /**
   * Send a free-form text message (only within 24h conversation window)
   */
  async sendTextMessage(to: string, text: string): Promise<SendMessageResult> {
    const phone = this.formatPhoneNumber(to);

    const payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: text },
    };

    return this.sendRequest(payload);
  }

  /**
   * Send an interactive message with buttons (max 3 buttons)
   */
  async sendButtonMessage(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<SendMessageResult> {
    const phone = this.formatPhoneNumber(to);

    const payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map((btn) => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title },
          })),
        },
      },
    };

    return this.sendRequest(payload);
  }

  /**
   * Send an interactive list message (for time slot selection)
   */
  async sendListMessage(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>
  ): Promise<SendMessageResult> {
    const phone = this.formatPhoneNumber(to);

    const payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: buttonText,
          sections,
        },
      },
    };

    return this.sendRequest(payload);
  }

  /**
   * Mark a message as read (shows blue checkmarks)
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await fetch(
        `${WHATSAPP_API_BASE}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
          }),
        }
      );
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }

  /**
   * Verify webhook challenge from Meta (used during webhook setup)
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.config.verifyToken) {
      return challenge;
    }
    return null;
  }

  /**
   * Parse incoming webhook payload from Meta
   */
  parseWebhookPayload(body: Record<string, unknown>): {
    messages: WebhookMessage[];
    statuses: WebhookStatus[];
  } {
    const messages: WebhookMessage[] = [];
    const statuses: WebhookStatus[] = [];

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entries = (body as any)?.entry || [];
      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          const value = change?.value;
          if (!value) continue;

          if (value.messages) {
            messages.push(...value.messages);
          }
          if (value.statuses) {
            statuses.push(...value.statuses);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing webhook payload:', error);
    }

    return { messages, statuses };
  }

  /**
   * Log a message to the database
   */
  async logMessage(
    conversationId: string,
    direction: 'outbound' | 'inbound',
    content: string,
    messageType: string = 'text',
    whatsappMessageId?: string,
    status: string = 'sent',
    metadata?: Record<string, unknown>
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        direction,
        message_type: messageType,
        content,
        whatsapp_message_id: whatsappMessageId || null,
        status,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error logging WhatsApp message:', error);
      return null;
    }

    return data.id;
  }

  /**
   * Update message delivery status from webhook status updates
   */
  async updateMessageStatus(
    whatsappMessageId: string,
    status: string,
    errorDetails?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('whatsapp_messages')
      .update({
        status,
        ...(errorDetails ? { error_details: errorDetails } : {}),
      })
      .eq('whatsapp_message_id', whatsappMessageId);

    if (error) {
      console.error('Error updating message status:', error);
    }
  }

  /**
   * Format Israeli phone number to international format for WhatsApp
   * Israeli numbers: 05X-XXXXXXX → 9725XXXXXXXXX
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with Israel country code
    if (cleaned.startsWith('0')) {
      cleaned = '972' + cleaned.substring(1);
    }

    // If doesn't start with country code, add it
    if (!cleaned.startsWith('972')) {
      cleaned = '972' + cleaned;
    }

    return cleaned;
  }

  /**
   * Core send request to Meta API
   */
  private async sendRequest(
    payload: Record<string, unknown>
  ): Promise<SendMessageResult> {
    if (!this.isConfigured()) {
      console.warn('WhatsApp not configured - skipping message send');
      return {
        success: false,
        error: 'WhatsApp credentials not configured',
      };
    }

    try {
      const response = await fetch(
        `${WHATSAPP_API_BASE}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg =
          data?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('WhatsApp API error:', data);
        return { success: false, error: errorMsg };
      }

      const messageId = data?.messages?.[0]?.id;
      return { success: true, messageId };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('WhatsApp send error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }
}
