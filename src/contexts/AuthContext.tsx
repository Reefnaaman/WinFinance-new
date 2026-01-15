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

      // Simple direct query with case-insensitive matching
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .ilike('email', email)
        .single()

      if (data && !error) {
        console.log('Agent found:', data.name)
        setUser(data as Agent)
      } else {
        console.error('No agent found for email:', email, 'Error:', error?.message)
        setUser(null)
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error)
      setUser(null)
    } finally {
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