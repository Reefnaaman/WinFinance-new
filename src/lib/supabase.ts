import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Lazy initialization to avoid build-time errors
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      // During build, return a dummy client that will never be used
      if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.warn('Supabase environment variables not found during build')
        // Return null during build to prevent errors
        return null as any
      }
      throw new Error('Missing required Supabase environment variables')
    }

    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
  }

  return supabaseClient
}

// Export the supabase client as a getter
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop, receiver) {
    const client = getSupabaseClient()
    if (!client) {
      throw new Error('Supabase client not initialized')
    }
    return Reflect.get(client, prop, receiver)
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
    // During build, return a dummy client
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      console.warn('Supabase service role key not found during build')
      return null as any
    }
    throw new Error('Missing required Supabase environment variables')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey)
}