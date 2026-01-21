import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null

export function getSupabase() {
  if (supabaseInstance) return supabaseInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Prevents session checks on tab focus/URL changes
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'lead-management'
      }
    }
  })

  return supabaseInstance
}

// Direct export of singleton instance - no more Proxy pattern
export const supabase = getSupabase()

// Server-side client singleton for API routes
let serverInstance: ReturnType<typeof createClient<Database>> | null = null

export const getServerSupabase = () => {
  if (serverInstance) return serverInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  serverInstance = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false, // Server-side doesn't need session persistence
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'x-application-name': 'lead-management-server'
      }
    }
  })

  return serverInstance
}

// Backward compatibility
export const createServerClient = getServerSupabase