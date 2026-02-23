export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string
          name: string
          email: string
          role: 'admin' | 'coordinator' | 'agent' | 'lead_supplier'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          role?: 'admin' | 'coordinator' | 'agent' | 'lead_supplier'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'admin' | 'coordinator' | 'agent' | 'lead_supplier'
          created_at?: string
        }
      }
      whatsapp_conversations: {
        Row: {
          id: string
          lead_id: string
          phone: string
          status: 'queued' | 'template_sent' | 'active' | 'meeting_scheduled' | 'not_interested' | 'no_reply' | 'error'
          assigned_agent_id: string | null
          meeting_date: string | null
          meeting_slot_start: string | null
          meeting_slot_end: string | null
          ai_context: Json
          template_sent_at: string | null
          last_message_at: string | null
          completed_at: string | null
          error_message: string | null
          batch_window: 'morning' | 'afternoon' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          phone: string
          status?: string
          assigned_agent_id?: string | null
          meeting_date?: string | null
          meeting_slot_start?: string | null
          meeting_slot_end?: string | null
          ai_context?: Json
          template_sent_at?: string | null
          last_message_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          batch_window?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          phone?: string
          status?: string
          assigned_agent_id?: string | null
          meeting_date?: string | null
          meeting_slot_start?: string | null
          meeting_slot_end?: string | null
          ai_context?: Json
          template_sent_at?: string | null
          last_message_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          batch_window?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      whatsapp_messages: {
        Row: {
          id: string
          conversation_id: string
          direction: 'outbound' | 'inbound'
          message_type: 'text' | 'template' | 'interactive' | 'image'
          content: string
          whatsapp_message_id: string | null
          status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          error_details: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          direction: 'outbound' | 'inbound'
          message_type?: string
          content: string
          whatsapp_message_id?: string | null
          status?: string
          error_details?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          direction?: string
          message_type?: string
          content?: string
          whatsapp_message_id?: string | null
          status?: string
          error_details?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      whatsapp_outreach_queue: {
        Row: {
          id: string
          lead_id: string
          phone: string
          lead_name: string
          status: 'pending' | 'processing' | 'sent' | 'skipped' | 'failed'
          scheduled_batch: 'morning' | 'afternoon' | null
          scheduled_date: string | null
          skip_reason: string | null
          attempts: number
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          phone: string
          lead_name: string
          status?: string
          scheduled_batch?: string | null
          scheduled_date?: string | null
          skip_reason?: string | null
          attempts?: number
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          phone?: string
          lead_name?: string
          status?: string
          scheduled_batch?: string | null
          scheduled_date?: string | null
          skip_reason?: string | null
          attempts?: number
          created_at?: string
          processed_at?: string | null
        }
      }
      agent_meeting_slots: {
        Row: {
          id: string
          agent_id: string
          slot_date: string
          slot_start: string
          slot_end: string
          lead_id: string | null
          conversation_id: string | null
          is_booked: boolean
          google_calendar_event_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          slot_date: string
          slot_start: string
          slot_end: string
          lead_id?: string | null
          conversation_id?: string | null
          is_booked?: boolean
          google_calendar_event_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          slot_date?: string
          slot_start?: string
          slot_end?: string
          lead_id?: string | null
          conversation_id?: string | null
          is_booked?: boolean
          google_calendar_event_id?: string | null
          created_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          lead_name: string
          phone: string
          email: string | null
          source: string
          created_at: string
          relevance_status: 'ממתין לבדיקה' | 'רלוונטי' | 'לא רלוונטי' | 'במעקב' | 'אין מענה'
          assigned_agent_id: string | null
          meeting_date: string | null
          scheduled_call_date: string | null
          status: 'ליד חדש' | 'תואם' | 'אין מענה - לתאם מחדש' | 'התקיימה - כשלון' | 'במעקב' | 'עסקה נסגרה' | 'לא רלוונטי' | null
          agent_notes: string | null
          color_code: string | null
          price: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          lead_name: string
          phone: string
          email?: string | null
          source: string
          created_at?: string
          relevance_status?: 'ממתין לבדיקה' | 'רלוונטי' | 'לא רלוונטי' | 'במעקב' | 'אין מענה'
          assigned_agent_id?: string | null
          meeting_date?: string | null
          scheduled_call_date?: string | null
          status?: 'ליד חדש' | 'תואם' | 'אין מענה' | 'אין מענה - לתאם מחדש' | 'התקיימה - כשלון' | 'במעקב' | 'עסקה נסגרה' | 'לא רלוונטי' | null
          agent_notes?: string | null
          color_code?: string | null
          price?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          lead_name?: string
          phone?: string
          email?: string | null
          source?: string
          created_at?: string
          relevance_status?: 'ממתין לבדיקה' | 'רלוונטי' | 'לא רלוונטי' | 'במעקב' | 'אין מענה'
          assigned_agent_id?: string | null
          meeting_date?: string | null
          scheduled_call_date?: string | null
          status?: 'ליד חדש' | 'תואם' | 'אין מענה' | 'אין מענה - לתאם מחדש' | 'התקיימה - כשלון' | 'במעקב' | 'עסקה נסגרה' | 'לא רלוונטי' | null
          agent_notes?: string | null
          color_code?: string | null
          price?: number | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      lead_status_enum: 'ליד חדש' | 'תואם' | 'אין מענה - לתאם מחדש' | 'התקיימה - כשלון' | 'במעקב' | 'עסקה נסגרה' | 'לא רלוונטי'
      relevance_status_enum: 'ממתין לבדיקה' | 'רלוונטי' | 'לא רלוונטי' | 'במעקב' | 'אין מענה'
      role_enum: 'admin' | 'coordinator' | 'agent' | 'lead_supplier'
      source_enum: 'Email' | 'Google Sheet' | 'Manual' | 'Other'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Lead = Database['public']['Tables']['leads']['Row']
export type Agent = Database['public']['Tables']['agents']['Row']
export type LeadInsert = Database['public']['Tables']['leads']['Insert']
export type LeadUpdate = Database['public']['Tables']['leads']['Update']

export type LeadStatus = Database['public']['Enums']['lead_status_enum']
export type RelevanceStatus = Database['public']['Enums']['relevance_status_enum']
export type SourceType = string
export type AgentRole = Database['public']['Enums']['role_enum']

// WhatsApp types
export type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row']
export type WhatsAppConversationInsert = Database['public']['Tables']['whatsapp_conversations']['Insert']
export type WhatsAppMessage = Database['public']['Tables']['whatsapp_messages']['Row']
export type WhatsAppMessageInsert = Database['public']['Tables']['whatsapp_messages']['Insert']
export type WhatsAppQueueItem = Database['public']['Tables']['whatsapp_outreach_queue']['Row']
export type AgentMeetingSlot = Database['public']['Tables']['agent_meeting_slots']['Row']

export type WhatsAppConversationStatus = 'queued' | 'template_sent' | 'active' | 'meeting_scheduled' | 'not_interested' | 'no_reply' | 'error'