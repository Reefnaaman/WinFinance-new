import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables')
}

// Create a single, stable client instance
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Prevent URL-based session conflicts
    flowType: 'pkce',
    storageKey: 'supabase-auth-token' // Explicit storage key
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'lead-management'
    }
  },
  // Add realtime and fetch options to prevent AbortError
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// For compatibility with code that uses getSupabase()
export function getSupabase() {
  return supabase
}

// Admin client for server-side operations
export const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey)
}