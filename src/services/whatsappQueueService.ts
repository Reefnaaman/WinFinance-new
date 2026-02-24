import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

const TIMEZONE = 'Asia/Jerusalem';
const WORK_DAYS = [0, 1, 2, 3, 4]; // Sunday through Thursday

// Batch windows (Israel time)
const MORNING_BATCH_HOUR = 9;
const MORNING_BATCH_MINUTE = 34;
const AFTERNOON_BATCH_HOUR = 14;
const AFTERNOON_BATCH_MINUTE = 20;

/**
 * Service for adding leads to the WhatsApp outreach queue
 * Call this after a lead is successfully created
 */
export class WhatsAppQueueService {
  private _supabase: ReturnType<typeof getSupabaseClient> | null = null;

  private get supabase() {
    if (!this._supabase) this._supabase = getSupabaseClient();
    return this._supabase;
  }

  /**
   * Queue a newly created lead for WhatsApp outreach
   * Determines the next available batch window and schedules the lead
   */
  async queueLeadForOutreach(
    leadId: string,
    leadName: string,
    phone: string
  ): Promise<{ queued: boolean; scheduledDate?: string; scheduledBatch?: string; reason?: string }> {
    // Validate phone number (must have digits for WhatsApp)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      return { queued: false, reason: 'Invalid phone number' };
    }

    // Format phone for WhatsApp (international format)
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '972' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('972')) {
      formattedPhone = '972' + formattedPhone;
    }

    // Check if lead already has an active conversation or is already queued
    const { data: existingConv } = await this.supabase
      .from('whatsapp_conversations')
      .select('id, status')
      .eq('lead_id', leadId)
      .not('status', 'in', '("error","no_reply")')
      .limit(1);

    if (existingConv && existingConv.length > 0) {
      return { queued: false, reason: 'Active conversation already exists' };
    }

    const { data: existingQueue } = await this.supabase
      .from('whatsapp_outreach_queue')
      .select('id')
      .eq('lead_id', leadId)
      .eq('status', 'pending')
      .limit(1);

    if (existingQueue && existingQueue.length > 0) {
      return { queued: false, reason: 'Already in outreach queue' };
    }

    // Calculate the next batch window
    const { date, batch } = this.getNextBatchWindow();

    // Add to queue
    const { error } = await this.supabase.from('whatsapp_outreach_queue').insert({
      lead_id: leadId,
      phone: formattedPhone,
      lead_name: leadName,
      status: 'pending',
      scheduled_batch: batch,
      scheduled_date: date,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error queuing lead for WhatsApp:', error);
      return { queued: false, reason: error.message };
    }

    console.log(
      `Lead ${leadName} (${leadId}) queued for WhatsApp outreach: ${date} ${batch}`
    );
    return { queued: true, scheduledDate: date, scheduledBatch: batch };
  }

  /**
   * Determine the next available batch window
   * Returns the date and batch ('morning' or 'afternoon')
   */
  private getNextBatchWindow(): { date: string; batch: 'morning' | 'afternoon' } {
    const now = new Date();
    const israelStr = now.toLocaleString('en-US', { timeZone: TIMEZONE });
    const israelNow = new Date(israelStr);

    const hour = israelNow.getHours();
    const minute = israelNow.getMinutes();
    const dayOfWeek = israelNow.getDay();

    // If before morning batch today and it's a work day
    if (
      WORK_DAYS.includes(dayOfWeek) &&
      (hour < MORNING_BATCH_HOUR ||
        (hour === MORNING_BATCH_HOUR && minute < MORNING_BATCH_MINUTE))
    ) {
      return {
        date: this.formatDate(israelNow),
        batch: 'morning',
      };
    }

    // If before afternoon batch today and it's a work day
    if (
      WORK_DAYS.includes(dayOfWeek) &&
      (hour < AFTERNOON_BATCH_HOUR ||
        (hour === AFTERNOON_BATCH_HOUR && minute < AFTERNOON_BATCH_MINUTE))
    ) {
      return {
        date: this.formatDate(israelNow),
        batch: 'afternoon',
      };
    }

    // Otherwise, schedule for the next working day's morning batch
    const nextWorkDay = this.getNextWorkDay(israelNow);
    return {
      date: this.formatDate(nextWorkDay),
      batch: 'morning',
    };
  }

  /**
   * Get the next working day (Sun-Thu) after the given date
   */
  private getNextWorkDay(fromDate: Date): Date {
    const next = new Date(fromDate);
    next.setDate(next.getDate() + 1);

    // Skip to next working day
    while (!WORK_DAYS.includes(next.getDay())) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
