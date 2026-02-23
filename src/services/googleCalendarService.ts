import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

interface MeetingEventParams {
  agentEmail: string;
  agentName: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );
  }

  /**
   * Get an authenticated Google API client for the given user
   * Reuses the same OAuth tokens stored for Gmail integration
   */
  private async getAuthenticatedClient(
    userEmail: string
  ): Promise<OAuth2Client | null> {
    try {
      const supabase = getSupabaseClient();
      const { data: tokenData, error } = await supabase
        .from('gmail_tokens')
        .select('*')
        .eq('user_email', userEmail)
        .single();

      if (error || !tokenData) {
        console.log(`No Google tokens found for ${userEmail}`);
        return null;
      }

      // Check if token is expired and refresh if needed
      const now = new Date();
      const tokenExpiry = new Date(tokenData.token_expiry);

      if (tokenExpiry <= now && tokenData.refresh_token) {
        this.oauth2Client.setCredentials({
          refresh_token: tokenData.refresh_token,
        });

        const { credentials } = await this.oauth2Client.refreshAccessToken();
        const newExpiry = credentials.expiry_date
          ? new Date(credentials.expiry_date).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString();

        await supabase
          .from('gmail_tokens')
          .update({
            access_token: credentials.access_token,
            token_expiry: newExpiry,
          })
          .eq('user_email', userEmail);

        this.oauth2Client.setCredentials(credentials);
      } else {
        this.oauth2Client.setCredentials({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
        });
      }

      return this.oauth2Client;
    } catch (error) {
      console.error('Error getting authenticated Calendar client:', error);
      return null;
    }
  }

  /**
   * Create a Google Calendar event for a scheduled meeting
   * Returns the event ID if successful, null otherwise
   */
  async createMeetingEvent(params: MeetingEventParams): Promise<string | null> {
    // Try to use the admin's Google account (the one connected for Gmail)
    // Fall back to using a service account if available
    const adminEmail = process.env.GOOGLE_CALENDAR_ADMIN_EMAIL;
    if (!adminEmail) {
      console.log('GOOGLE_CALENDAR_ADMIN_EMAIL not configured, skipping calendar event');
      return null;
    }

    const auth = await this.getAuthenticatedClient(adminEmail);
    if (!auth) {
      console.log('Could not authenticate for Google Calendar');
      return null;
    }

    const calendar = google.calendar({ version: 'v3', auth });

    try {
      const event = {
        summary: `פגישת ייעוץ ביטוח - ${params.leadName}`,
        description: [
          `פגישה עם ליד: ${params.leadName}`,
          `טלפון: ${params.leadPhone}`,
          params.leadEmail ? `אימייל: ${params.leadEmail}` : '',
          `סוכן: ${params.agentName}`,
          '',
          'פגישה זו נקבעה אוטומטית דרך מערכת WhatsApp של WinFinance.',
        ]
          .filter(Boolean)
          .join('\n'),
        start: {
          dateTime: params.startTime,
          timeZone: 'Asia/Jerusalem',
        },
        end: {
          dateTime: params.endTime,
          timeZone: 'Asia/Jerusalem',
        },
        attendees: [
          { email: params.agentEmail, displayName: params.agentName },
          ...(params.leadEmail
            ? [{ email: params.leadEmail, displayName: params.leadName }]
            : []),
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all', // Send email notifications to attendees
      });

      console.log(`Calendar event created: ${response.data.id}`);
      return response.data.id || null;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return null;
    }
  }

  /**
   * Delete a calendar event (e.g., if meeting is cancelled)
   */
  async deleteMeetingEvent(eventId: string): Promise<boolean> {
    const adminEmail = process.env.GOOGLE_CALENDAR_ADMIN_EMAIL;
    if (!adminEmail) return false;

    const auth = await this.getAuthenticatedClient(adminEmail);
    if (!auth) return false;

    const calendar = google.calendar({ version: 'v3', auth });

    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all',
      });
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return false;
    }
  }
}
