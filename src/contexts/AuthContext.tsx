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

  const fetchUserData = async (email: string) => {
    try {
      console.log('Fetching user data for email:', email)

      // Simple, direct query with lowercase email
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('email', email.toLowerCase())
        .single()

      if (error) {
        console.error('Database error:', error.message)
        setUser(null)
      } else if (data) {
        console.log('Agent found:', (data as Agent).name)
        setUser(data as Agent)
      } else {
        console.error('No agent found for email:', email)
        setUser(null)
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true;
    let authListenerInitialized = false;

    // Check for existing session on mount
    console.log('AuthContext: Checking for existing session...')

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mounted) return; // Prevent state updates if component unmounted

        if (error) {
          console.error('Session error:', error)
          setUser(null)
          setLoading(false)
          return
        }

        if (session?.user?.email) {
          console.log('Session found, fetching user data for:', session.user.email)
          await fetchUserData(session.user.email)
        } else {
          console.log('No session found, user not logged in')
          setUser(null)
          setLoading(false)
        }
      } catch (error) {
        if (mounted) {
          console.error('Error initializing auth:', error)
          setUser(null)
          setLoading(false)
        }
      } finally {
        authListenerInitialized = true;
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)

      if (!mounted || !authListenerInitialized) return;

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
      } else if (event === 'SIGNED_IN' && session?.user?.email) {
        // For sign in events, always fetch user data
        setLoading(true)
        await fetchUserData(session.user.email)
      } else if (event === 'TOKEN_REFRESHED') {
        // Session refreshed, but don't refetch user data if we already have it
        console.log('Token refreshed, maintaining current user state')
      }
    })

    return () => {
      mounted = false;
      subscription.unsubscribe()
    }
  }, []) // Empty dependency array to avoid re-running

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
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
      setLoading(false)
    } catch (error) {
      console.error('Error signing out:', error)
      setUser(null)
      setLoading(false)
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