import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Israel working hours (Asia/Jerusalem)
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 19;
const SLOT_DURATION_MINUTES = 30;
const TIMEZONE = 'Asia/Jerusalem';

// Sunday=0, Monday=1, ..., Thursday=4 (Israeli work week)
const WORK_DAYS = [0, 1, 2, 3, 4]; // Sunday through Thursday

interface TimeSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  startISO: string; // Full ISO string in Israel time
  endISO: string;
  displayHebrew: string; // Human-readable in Hebrew
}

interface AgentWithSlots {
  agentId: string;
  agentName: string;
  bookedSlotCount: number;
}

interface ScheduleResult {
  success: boolean;
  agentId?: string;
  agentName?: string;
  slot?: TimeSlot;
  slotId?: string;
  error?: string;
}

export class AgentSchedulingService {
  private supabase = getSupabaseClient();

  /**
   * Get all available time slots for the next N working days
   */
  async getAvailableSlots(daysAhead: number = 5): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const now = this.getIsraelTime();
    let currentDate = new Date(now);

    let workDaysFound = 0;
    while (workDaysFound < daysAhead) {
      // Check if it's a working day (Sun-Thu)
      const dayOfWeek = this.getIsraelDayOfWeek(currentDate);
      if (WORK_DAYS.includes(dayOfWeek)) {
        const dateStr = this.formatDateISO(currentDate);
        const daySlots = this.generateDaySlots(dateStr, currentDate, now);
        slots.push(...daySlots);
        workDaysFound++;
      }
      // Move to next day
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    // Filter out already booked slots
    const bookedSlots = await this.getBookedSlots(
      slots[0]?.date,
      slots[slots.length - 1]?.date
    );

    return slots.filter(
      (slot) =>
        !bookedSlots.some(
          (booked) =>
            booked.slot_date === slot.date && booked.slot_start === slot.startTime
        )
    );
  }

  /**
   * Get available slots formatted for WhatsApp list message
   */
  async getSlotsForWhatsApp(
    maxSlots: number = 10
  ): Promise<
    Array<{
      title: string;
      rows: Array<{ id: string; title: string; description: string }>;
    }>
  > {
    const availableSlots = await this.getAvailableSlots(5);
    const limitedSlots = availableSlots.slice(0, maxSlots);

    // Group by date
    const grouped: Record<string, TimeSlot[]> = {};
    for (const slot of limitedSlots) {
      if (!grouped[slot.date]) grouped[slot.date] = [];
      grouped[slot.date].push(slot);
    }

    return Object.entries(grouped).map(([date, dateSlots]) => ({
      title: this.formatDateHebrew(date),
      rows: dateSlots.map((slot) => ({
        id: `slot_${slot.date}_${slot.startTime.replace(':', '')}`,
        title: `${slot.startTime} - ${slot.endTime}`,
        description: slot.displayHebrew,
      })),
    }));
  }

  /**
   * Parse a slot selection ID back to date and time
   */
  parseSlotId(slotId: string): { date: string; startTime: string } | null {
    // Format: slot_YYYY-MM-DD_HHMM
    const match = slotId.match(/^slot_(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})$/);
    if (!match) return null;
    return {
      date: match[1],
      startTime: `${match[2]}:${match[3]}`,
    };
  }

  /**
   * Assign a lead to an agent using round-robin and book the slot
   */
  async scheduleMeeting(
    leadId: string,
    conversationId: string,
    slotDate: string,
    slotStartTime: string
  ): Promise<ScheduleResult> {
    // 1. Pick the next agent (round-robin based on least bookings this week)
    const agent = await this.getNextAgent();
    if (!agent) {
      return { success: false, error: 'לא נמצאו סוכנים זמינים' };
    }

    // 2. Calculate slot end time
    const [hours, minutes] = slotStartTime.split(':').map(Number);
    const endMinutes = minutes + SLOT_DURATION_MINUTES;
    const endHour = hours + Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const slotEndTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    // 3. Check slot is still available
    const { data: existing } = await this.supabase
      .from('agent_meeting_slots')
      .select('id')
      .eq('slot_date', slotDate)
      .eq('slot_start', slotStartTime)
      .eq('agent_id', agent.agentId)
      .eq('is_booked', true)
      .single();

    if (existing) {
      return { success: false, error: 'המועד כבר תפוס, אנא בחר מועד אחר' };
    }

    // 4. Create the booking
    const meetingDateISO = this.toIsraelISO(slotDate, slotStartTime);
    const meetingEndISO = this.toIsraelISO(slotDate, slotEndTime);

    const { data: slot, error: slotError } = await this.supabase
      .from('agent_meeting_slots')
      .insert({
        agent_id: agent.agentId,
        slot_date: slotDate,
        slot_start: slotStartTime,
        slot_end: slotEndTime,
        lead_id: leadId,
        conversation_id: conversationId,
        is_booked: true,
      })
      .select('id')
      .single();

    if (slotError) {
      console.error('Error booking slot:', slotError);
      return { success: false, error: 'שגיאה בקביעת הפגישה' };
    }

    // 5. Update the lead record
    await this.supabase
      .from('leads')
      .update({
        assigned_agent_id: agent.agentId,
        meeting_date: meetingDateISO,
        status: 'תואם',
        relevance_status: 'רלוונטי',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    // 6. Update the conversation
    await this.supabase
      .from('whatsapp_conversations')
      .update({
        status: 'meeting_scheduled',
        assigned_agent_id: agent.agentId,
        meeting_date: meetingDateISO,
        meeting_slot_start: meetingDateISO,
        meeting_slot_end: meetingEndISO,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return {
      success: true,
      agentId: agent.agentId,
      agentName: agent.agentName,
      slot: {
        date: slotDate,
        startTime: slotStartTime,
        endTime: slotEndTime,
        startISO: meetingDateISO,
        endISO: meetingEndISO,
        displayHebrew: `${this.formatDateHebrew(slotDate)}, ${slotStartTime}-${slotEndTime}`,
      },
      slotId: slot.id,
    };
  }

  /**
   * Round-robin: pick the agent with the fewest bookings this week
   */
  private async getNextAgent(): Promise<AgentWithSlots | null> {
    // Get all agents with role='agent'
    const { data: agents, error: agentError } = await this.supabase
      .from('agents')
      .select('id, name')
      .eq('role', 'agent');

    if (agentError || !agents || agents.length === 0) {
      console.error('No agents found:', agentError);
      return null;
    }

    // Get this week's bookings for each agent
    const startOfWeek = this.getStartOfWeek();
    const endOfWeek = new Date(startOfWeek.getTime() + 5 * 24 * 60 * 60 * 1000); // Sun-Thu

    const { data: bookings } = await this.supabase
      .from('agent_meeting_slots')
      .select('agent_id')
      .eq('is_booked', true)
      .gte('slot_date', this.formatDateISO(startOfWeek))
      .lte('slot_date', this.formatDateISO(endOfWeek));

    // Count bookings per agent
    const bookingCounts: Record<string, number> = {};
    for (const agent of agents) {
      bookingCounts[agent.id] = 0;
    }
    for (const booking of bookings || []) {
      if (bookingCounts[booking.agent_id] !== undefined) {
        bookingCounts[booking.agent_id]++;
      }
    }

    // Pick agent with least bookings
    const sorted = agents.sort(
      (a, b) => (bookingCounts[a.id] || 0) - (bookingCounts[b.id] || 0)
    );

    return {
      agentId: sorted[0].id,
      agentName: sorted[0].name,
      bookedSlotCount: bookingCounts[sorted[0].id] || 0,
    };
  }

  /**
   * Generate 30-minute slots for a given day
   */
  private generateDaySlots(
    dateStr: string,
    date: Date,
    now: Date
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const isToday = this.formatDateISO(date) === this.formatDateISO(now);

    for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
      for (let min = 0; min < 60; min += SLOT_DURATION_MINUTES) {
        // Skip past slots if today
        if (isToday) {
          const israelNow = this.getIsraelTime();
          const nowHour = israelNow.getHours();
          const nowMin = israelNow.getMinutes();
          // Require at least 1 hour ahead for scheduling
          if (hour < nowHour + 1 || (hour === nowHour + 1 && min < nowMin)) {
            continue;
          }
        }

        const startTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        const endMin = min + SLOT_DURATION_MINUTES;
        const endHour = hour + Math.floor(endMin / 60);
        const endMinute = endMin % 60;
        const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

        slots.push({
          date: dateStr,
          startTime,
          endTime,
          startISO: this.toIsraelISO(dateStr, startTime),
          endISO: this.toIsraelISO(dateStr, endTime),
          displayHebrew: `${this.formatDateHebrew(dateStr)}, ${startTime}`,
        });
      }
    }

    return slots;
  }

  /**
   * Get all booked slots in a date range
   */
  private async getBookedSlots(
    startDate?: string,
    endDate?: string
  ): Promise<Array<{ slot_date: string; slot_start: string; agent_id: string }>> {
    if (!startDate || !endDate) return [];

    const { data } = await this.supabase
      .from('agent_meeting_slots')
      .select('slot_date, slot_start, agent_id')
      .eq('is_booked', true)
      .gte('slot_date', startDate)
      .lte('slot_date', endDate);

    return data || [];
  }

  // ─── Timezone helpers ─────────────────────────────────────────

  private getIsraelTime(): Date {
    const now = new Date();
    const israelStr = now.toLocaleString('en-US', { timeZone: TIMEZONE });
    return new Date(israelStr);
  }

  private getIsraelDayOfWeek(date: Date): number {
    const israelStr = date.toLocaleString('en-US', {
      timeZone: TIMEZONE,
      weekday: 'short',
    });
    const dayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    return dayMap[israelStr] ?? date.getDay();
  }

  private formatDateISO(date: Date): string {
    const israelStr = date.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
    return israelStr; // Returns YYYY-MM-DD
  }

  private formatDateHebrew(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    const dayNames = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const day = dayNames[date.getDay()];
    const dayNum = date.getDate();
    const month = monthNames[date.getMonth()];
    return `${day}, ${dayNum} ${month}`;
  }

  private toIsraelISO(dateStr: string, timeStr: string): string {
    // Create a date in Israel timezone
    // We use a workaround: create the date string and parse it
    const dateTimeStr = `${dateStr}T${timeStr}:00`;
    const date = new Date(dateTimeStr);
    // Adjust for Israel timezone offset
    const israelFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    // For simplicity, store as the Israel local time with a note
    // The actual ISO conversion happens at the DB level
    return `${dateStr}T${timeStr}:00+02:00`;
  }

  private getStartOfWeek(): Date {
    const now = this.getIsraelTime();
    const dayOfWeek = now.getDay(); // 0=Sunday
    const diff = dayOfWeek; // Sunday is start of Israeli week
    const start = new Date(now);
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }
}
