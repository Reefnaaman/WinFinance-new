import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export interface AuthenticatedAgent {
  id: string
  name: string
  email: string
  role: 'admin' | 'coordinator' | 'agent' | 'lead_supplier'
  apiKeyId: string
  apiKeyName: string
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function validateApiKey(request: NextRequest): Promise<{
  isValid: boolean
  agent?: AuthenticatedAgent
  error?: string
}> {
  try {
    // Check for API key in header
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key')

    if (!apiKey) {
      return {
        isValid: false,
        error: 'API key is required. Add X-API-Key header to your request.'
      }
    }

    // Validate API key format
    if (!apiKey.startsWith('wf_') || apiKey.length !== 35) {
      return {
        isValid: false,
        error: 'Invalid API key format'
      }
    }

    const supabase = getSupabaseClient()

    // Look up API key
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select(`
        id,
        agent_id,
        name,
        is_active,
        permissions,
        agents (
          id,
          name,
          email,
          role
        )
      `)
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    if (keyError || !apiKeyData) {
      return {
        isValid: false,
        error: 'Invalid or inactive API key'
      }
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id)

    // Return authenticated agent info
    // agents is returned as an array from the join, get the first element
    const agentData = Array.isArray(apiKeyData.agents) ? apiKeyData.agents[0] : apiKeyData.agents

    return {
      isValid: true,
      agent: {
        id: agentData.id,
        name: agentData.name,
        email: agentData.email,
        role: agentData.role,
        apiKeyId: apiKeyData.id,
        apiKeyName: apiKeyData.name
      }
    }

  } catch (error) {
    console.error('API authentication error:', error)
    return {
      isValid: false,
      error: 'Authentication failed'
    }
  }
}

// Helper function to check if request is from internal system
export function isInternalRequest(request: NextRequest): boolean {
  // Check if request is from internal services (Gmail webhook, etc.)
  const internalSecret = request.headers.get('X-Internal-Secret')
  const expectedSecret = process.env.INTERNAL_API_SECRET

  if (internalSecret && expectedSecret && internalSecret === expectedSecret) {
    return true
  }

  // Check if request is from localhost (development)
  const host = request.headers.get('host')
  if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
    return true
  }

  return false
}

// Middleware to require authentication
export async function requireApiAuth(request: NextRequest): Promise<{
  authorized: boolean
  agent?: AuthenticatedAgent
  error?: string
  response?: Response
}> {
  // Skip auth for internal requests
  if (isInternalRequest(request)) {
    return { authorized: true }
  }

  const { isValid, agent, error } = await validateApiKey(request)

  if (!isValid) {
    return {
      authorized: false,
      error: error || 'Unauthorized',
      response: new Response(
        JSON.stringify({
          error: error || 'Unauthorized',
          message: 'נדרש מפתח API תקף. הוסף X-API-Key לכותרות הבקשה.'
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'API-Key'
          }
        }
      )
    }
  }

  return {
    authorized: true,
    agent
  }
}