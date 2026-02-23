import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppConversationService } from '@/services/whatsappConversationService';

const TIMEZONE = 'Asia/Jerusalem';

// Work days: Sunday (0) through Thursday (4)
const WORK_DAYS = [0, 1, 2, 3, 4];

/**
 * GET: Cron endpoint for WhatsApp batch sending
 *
 * Called by Vercel Cron every 30 minutes. The handler checks the current
 * Israel time and only processes if it's within the batch windows:
 * - Morning batch: 9:34 AM Israel time
 * - Afternoon batch: 14:20 Israel time
 *
 * This approach handles DST changes correctly since we check Israel time
 * at runtime rather than relying on UTC cron schedules.
 */
export async function GET(request: NextRequest) {
  try {
    const conversationService = new WhatsAppConversationService();

    // Get current Israel time
    const now = new Date();
    const israelTimeStr = now.toLocaleString('en-US', { timeZone: TIMEZONE });
    const israelTime = new Date(israelTimeStr);
    const hour = israelTime.getHours();
    const minute = israelTime.getMinutes();
    const dayOfWeek = israelTime.getDay();

    // Check if it's a working day (Sun-Thu)
    if (!WORK_DAYS.includes(dayOfWeek)) {
      return NextResponse.json({
        status: 'skipped',
        reason: 'Not a working day (Sun-Thu only)',
        israelTime: israelTimeStr,
      });
    }

    // Determine which batch window we're in
    // Morning: 9:30-9:59 Israel time (catches 9:34)
    // Afternoon: 14:00-14:29 Israel time (catches 14:20)
    let batchWindow: 'morning' | 'afternoon' | null = null;

    if (hour === 9 && minute >= 30 && minute <= 59) {
      batchWindow = 'morning';
    } else if (hour === 14 && minute >= 0 && minute <= 29) {
      batchWindow = 'afternoon';
    }

    if (!batchWindow) {
      return NextResponse.json({
        status: 'skipped',
        reason: 'Outside batch windows (9:30-9:59 or 14:00-14:29 Israel time)',
        israelTime: israelTimeStr,
        currentHour: hour,
        currentMinute: minute,
      });
    }

    console.log(`Processing ${batchWindow} WhatsApp batch at ${israelTimeStr}`);

    // Process the batch
    const result = await conversationService.processBatch(batchWindow);

    // Also mark timed-out conversations (no reply within 24h)
    const timedOut = await conversationService.markTimedOutConversations();

    return NextResponse.json({
      status: 'ok',
      batchWindow,
      israelTime: israelTimeStr,
      result,
      timedOutConversations: timedOut,
    });
  } catch (error) {
    console.error('WhatsApp batch send error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
