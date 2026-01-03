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
      leads: {
        Row: {
          id: string
          lead_name: string
          phone: string
          email: string | null
          source: string
          created_at: string
          relevance_status: 'ממתין לבדיקה' | 'רלוונטי' | 'לא רלוונטי' | 'במעקב'
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
          relevance_status?: 'ממתין לבדיקה' | 'רלוונטי' | 'לא רלוונטי' | 'במעקב'
          assigned_agent_id?: string | null
          meeting_date?: string | null
          scheduled_call_date?: string | null
          status?: 'ליד חדש' | 'תואם' | 'אין מענה - לתאם מחדש' | 'התקיימה - כשלון' | 'במעקב' | 'עסקה נסגרה' | 'לא רלוונטי' | null
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
          relevance_status?: 'ממתין לבדיקה' | 'רלוונטי' | 'לא רלוונטי' | 'במעקב'
          assigned_agent_id?: string | null
          meeting_date?: string | null
          scheduled_call_date?: string | null
          status?: 'ליד חדש' | 'תואם' | 'אין מענה - לתאם מחדש' | 'התקיימה - כשלון' | 'במעקב' | 'עסקה נסגרה' | 'לא רלוונטי' | null
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
      relevance_status_enum: 'ממתין לבדיקה' | 'רלוונטי' | 'לא רלוונטי' | 'במעקב'
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