'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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

  useEffect(() => {
    // Check for existing session on mount
    console.log('AuthContext: Checking for existing session...')
    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
      const { data: { session }, error } = await supabase.auth.getSession()
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

      // ALWAYS fetch from the real database with timeout
      console.log('Attempting database query...')

      // Create a timeout promise that resolves (not rejects) with an error
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolve({ data: null, error: { message: 'Query timeout after 3 seconds' } })
        }, 3000) // Reduced to 3 seconds for faster fallback
      })

      // Create the query promise
      const queryPromise = supabase
        .from('agents')
        .select('*')
        .eq('email', email)
        .single()

      // Race between timeout and query
      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any

      console.log('Agent query result:', { data, error, email })

      if (error) {
        // Only log as warning for timeout, not error
        if (error.message && error.message.includes('timeout')) {
          console.warn('Database query timed out - using session email as fallback')
          // Create a basic user from the session email
          const fallbackUser: Agent = {
            id: email, // Use email as temporary ID
            name: email.split('@')[0],
            email: email,
            role: 'agent', // Default role, will be corrected when DB responds
            created_at: new Date().toISOString()
          }
          setUser(fallbackUser)
          setLoading(false)

          // Try to fetch the real data in background (non-blocking)
          Promise.resolve(supabase
            .from('agents')
            .select('*')
            .eq('email', email)
            .single())
            .then(({ data }) => {
              if (data) {
                console.log('Background fetch successful, updating user data')
                setUser(data)
              }
            })
            .catch(() => {
              // Silently fail - we already have fallback
            })
          return
        }

        console.error('Error fetching user data:', error.message || error)

        // Try with case-insensitive search
        try {
          const { data: ciData, error: ciError } = await supabase
            .from('agents')
            .select('*')
            .ilike('email', email)
            .single()

          console.log('Case-insensitive query result:', { data: ciData, error: ciError })

          if (ciData) {
            console.log('Setting user (case-insensitive match):', ciData)
            setUser(ciData)
            setLoading(false)
            return
          }
        } catch (e) {
          console.error('Case-insensitive search also failed:', e)
        }

        // Still no match - show error
        console.error('No agent found for email:', email)
        setUser(null)
        setLoading(false)
        return
      }

      if (!data) {
        console.error('No data returned for email:', email)
        setUser(null)
        setLoading(false)
        return
      }

      console.log('Setting user:', data)
      setUser(data)
      setLoading(false)
    } catch (error) {
      console.error('Error in fetchUserData:', error)
      // Don't create a fallback user - let the user know there's an issue
      setUser(null)
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
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
      await supabase.auth.signOut()
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