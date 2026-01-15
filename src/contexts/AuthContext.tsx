'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase'
import { Agent } from '@/lib/database.types'

interface AuthContextType {
  user: Agent | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  isAdmin: () => boolean
  isCoordinator: () => boolean
  isAgent: () => boolean
  canCreateLeads: () => boolean
  canAssignLeads: () => boolean
  canViewAllLeads: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = getSupabase()

  useEffect(() => {
    // Check for existing session on mount
    console.log('AuthContext: Checking for existing session...')
    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      if (event === 'SIGNED_IN' && session?.user?.email) {
        await fetchUserData(session.user.email) // fetchUserData now handles setLoading
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkUser = async () => {
    try {
      console.log('Fetching session...')
      const { data: { session }, error } = await getSupabase().auth.getSession()
      console.log('Session result:', session, 'Error:', error)

      if (session?.user?.email) {
        console.log('Session found, fetching user data for:', session.user.email)
        await fetchUserData(session.user.email)
        // Don't set loading false here since fetchUserData handles it
      } else {
        // No session, so no user logged in
        console.log('No session found, user not logged in')
        setUser(null)
        setLoading(false) // Only set loading false here if no session
      }
    } catch (error) {
      console.error('Error checking user:', error)
      setUser(null)
      setLoading(false) // Set loading false on error
    }
  }

  const fetchUserData = async (email: string) => {
    try {
      console.log('Fetching user data for email:', email)

      // Add a small delay to ensure auth is fully initialized
      await new Promise(resolve => setTimeout(resolve, 100))

      // Create a fresh client instance for the query
      const client = getSupabase()

      // Try with both exact and case-insensitive match
      let { data, error } = await client
        .from('agents')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle()

      // If lowercase didn't work, try with original case
      if (!data && !error) {
        const result = await client
          .from('agents')
          .select('*')
          .ilike('email', email)
          .maybeSingle()
        data = result.data
        error = result.error
      }

      if (data) {
        console.log('Agent found:', (data as Agent).name)
        setUser(data as Agent)
      } else {
        console.error('No agent found for email:', email, 'Error:', error?.message || 'No matching agent')
        // Log more details for debugging
        if (error) {
          console.error('Error details:', error)
        }
        setUser(null)
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error)
      // Log full error for debugging
      console.error('Full error object:', JSON.stringify(error, null, 2))
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await getSupabase().auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.user?.email) {
        await fetchUserData(data.user.email)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'אירעה שגיאה בהתחברות' }
    }
  }

  const logout = async () => {
    try {
      await getSupabase().auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Role checking functions
  const isAdmin = () => user?.role === 'admin'
  const isCoordinator = () => user?.role === 'coordinator'
  const isAgent = () => user?.role === 'agent'

  // Permission functions
  const canCreateLeads = () => isAdmin() || isCoordinator()
  const canAssignLeads = () => isAdmin() || isCoordinator()
  const canViewAllLeads = () => isAdmin() || isCoordinator()

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin,
    isCoordinator,
    isAgent,
    canCreateLeads,
    canAssignLeads,
    canViewAllLeads,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}