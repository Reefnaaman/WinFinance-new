import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService } from '@/services/whatsappService';
import { WhatsAppConversationService } from '@/services/whatsappConversationService';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const whatsappService = new WhatsAppService();
const conversationService = new WhatsAppConversationService();

/**
 * GET: Webhook verification (Meta sends this during webhook setup)
 * Meta will send: ?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE
 */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (mode && token && challenge) {
    const result = whatsappService.verifyWebhook(mode, token, challenge);
    if (result) {
      console.log('WhatsApp webhook verified successfully');
      return new NextResponse(result, { status: 200 });
    }
    console.error('WhatsApp webhook verification failed - token mismatch');
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
  }

  return NextResponse.json({ status: 'WhatsApp webhook endpoint active' });
}

/**
 * POST: Handle incoming WhatsApp messages and status updates
 * Meta sends all message events here
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Parse the webhook payload
    const { messages, statuses } = whatsappService.parseWebhookPayload(body);

    // Process message status updates (sent, delivered, read, failed)
    for (const status of statuses) {
      try {
        await whatsappService.updateMessageStatus(
          status.id,
          status.status,
          status.errors?.[0]?.message
        );
      } catch (err) {
        console.error('Error processing status update:', err);
      }
    }

    // Process incoming messages
    for (const message of messages) {
      try {
        // Extract message text based on type
        let messageText = '';
        let messageType = message.type;

        switch (message.type) {
          case 'text':
            messageText = message.text?.body || '';
            break;
          case 'interactive':
            if (message.interactive?.button_reply) {
              messageText = message.interactive.button_reply.id;
              messageType = 'interactive';
            } else if (message.interactive?.list_reply) {
              messageText = message.interactive.list_reply.id;
              messageType = 'interactive';
            }
            break;
          case 'button':
            messageText = message.button?.payload || message.button?.text || '';
            messageType = 'interactive';
            break;
          default:
            // Unsupported message type - log and skip
            console.log(`Unsupported message type: ${message.type} from ${message.from}`);
            await logWebhookEvent(
              'unsupported_type',
              message.from,
              JSON.stringify(message)
            );
            continue;
        }

        if (!messageText) continue;

        // Format the phone number to match our stored format
        const phone = formatIncomingPhone(message.from);

        console.log(`Incoming WhatsApp from ${phone}: ${messageText}`);

        // Hand off to the conversation service
        await conversationService.handleIncomingMessage(
          phone,
          messageText,
          message.id,
          messageType
        );

        // Log the webhook event
        await logWebhookEvent('message_received', phone, messageText);
      } catch (err) {
        console.error(`Error processing message from ${message.from}:`, err);
        await logWebhookEvent(
          'processing_error',
          message.from,
          JSON.stringify({ error: String(err), message })
        );
      }
    }

    // Always return 200 to prevent Meta from retrying
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    // Still return 200 to prevent retry storms
    return NextResponse.json({ status: 'ok' });
  }
}

/**
 * Format incoming phone number from WhatsApp (972XXXXXXXXX) to local format (0XXXXXXXXX)
 * This matches the format stored in leads/conversations
 */
function formatIncomingPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  // Keep the international format since that's what we store in conversations
  if (!cleaned.startsWith('972')) {
    cleaned = '972' + cleaned;
  }
  return cleaned;
}

/**
 * Log webhook events for monitoring
 */
async function logWebhookEvent(
  type: string,
  phone: string,
  details: string
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase.from('email_logs').insert({
      email_from: `whatsapp_webhook`,
      email_subject: `WhatsApp ${type}: ${phone}`,
      processed_at: new Date().toISOString(),
      lead_created: false,
      raw_content: details,
    });
  } catch (err) {
    console.error('Error logging webhook event:', err);
  }
}
