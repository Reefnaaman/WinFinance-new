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

  // Cache to prevent fetching same user multiple times
  const userCacheRef = React.useRef<{ email: string; user: Agent | null } | null>(null)

  const fetchUserData = async (email: string) => {
    try {
      // Check cache first
      if (userCacheRef.current?.email === email.toLowerCase()) {
        console.log('Using cached user data for:', email)
        setUser(userCacheRef.current.user)
        setLoading(false)
        return
      }

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
        userCacheRef.current = { email: email.toLowerCase(), user: null }
      } else if (data) {
        console.log('Agent found:', (data as Agent).name)
        setUser(data as Agent)
        userCacheRef.current = { email: email.toLowerCase(), user: data as Agent }
      } else {
        console.error('No agent found for email:', email)
        setUser(null)
        userCacheRef.current = { email: email.toLowerCase(), user: null }
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error)
      setUser(null)
      userCacheRef.current = { email: email.toLowerCase(), user: null }
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
          console.log('Session found, checking cache for:', session.user.email)
          // Check cache first to avoid duplicate fetches
          if (userCacheRef.current?.email === session.user.email.toLowerCase()) {
            console.log('Using cached user data from init')
            setUser(userCacheRef.current.user)
            setLoading(false)
          } else {
            console.log('No cache found, fetching user data for:', session.user.email)
            await fetchUserData(session.user.email)
          }
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
      console.log('Auth state changed:', event, session?.user?.email, 'mounted:', mounted, 'initialized:', authListenerInitialized)

      if (!mounted || !authListenerInitialized) {
        console.log('Skipping auth state change - component not ready')
        return
      }

      try {
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing state')
          userCacheRef.current = null // Clear cache on sign out
          setUser(null)
          setLoading(false)
        } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user?.email) {
          // For sign in or initial session events, fetch user data only if we don't have it cached
          console.log(`User ${event.toLowerCase()}, checking cache...`)
          if (!userCacheRef.current || userCacheRef.current.email !== session.user.email.toLowerCase()) {
            setLoading(true)
            await fetchUserData(session.user.email)
          } else {
            console.log(`Using cached user data after ${event.toLowerCase()}`)
            setUser(userCacheRef.current.user) // Ensure state is set from cache
            setLoading(false)
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Session refreshed, maintain current state - NO fetching needed
          console.log('Token refreshed, maintaining current user state:', user?.email)
          // Only fetch if we truly have no user data
          if (!user && !userCacheRef.current && session?.user?.email) {
            console.log('Token refreshed but no user in state or cache, fetching...')
            await fetchUserData(session.user.email)
          }
        }
      } catch (error) {
        console.error('Error handling auth state change:', error)
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
      userCacheRef.current = null // Clear cache on logout
      setUser(null)
      setLoading(false)
    } catch (error) {
      console.error('Error signing out:', error)
      userCacheRef.current = null // Clear cache even on error
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