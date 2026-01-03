'use client'

import React, { useState, useEffect } from 'react'
import { signIn, useSession, signOut } from 'next-auth/react'
import { Mail, CheckCircle, XCircle, Loader } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function GmailConnect() {
  const { data: session, status } = useSession()
  const { user } = useAuth() // Get the current logged-in user
  const [isConnecting, setIsConnecting] = useState(false)
  const [gmailStatus, setGmailStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null)

  useEffect(() => {
    checkGmailConnection()
  }, [session, user])

  const checkGmailConnection = async () => {
    setGmailStatus('checking')

    try {
      // Check for any Gmail tokens (not filtered by current user)
      // This allows checking if ANY Gmail is connected
      const { data, error } = await supabase
        .from('gmail_tokens')
        .select('user_email, token_expiry')
        .order('created_at', { ascending: false }) as {
          data: { user_email: string; token_expiry: string }[] | null;
          error: any
        }

      console.log('Gmail tokens query result:', {
        data,
        error,
        currentUser: user?.email,
        timestamp: new Date().toISOString()
      })

      if (error) {
        console.error('Supabase error:', error)
        setGmailStatus('disconnected')
        return
      }

      if (data && data.length > 0) {
        const token = data[0]
        const expiryDate = new Date(token.token_expiry)
        const now = new Date()

        console.log('Token validation:', {
          tokenExpiry: expiryDate.toISOString(),
          now: now.toISOString(),
          isValid: expiryDate > now
        })

        if (expiryDate > now) {
          setGmailStatus('connected')
          setConnectedEmail(token.user_email)
        } else {
          // Token expired, try to refresh it
          console.log('Token expired, attempting to refresh...')

          const refreshResponse = await fetch('/api/gmail/refresh-token', {
            method: 'POST'
          })

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            console.log('Token refreshed successfully:', refreshData)
            setGmailStatus('connected')
            setConnectedEmail(token.user_email)
          } else {
            console.error('Failed to refresh token')
            setGmailStatus('disconnected')
            setConnectedEmail(null)
          }
        }
      } else {
        console.log('No Gmail tokens found in database')
        setGmailStatus('disconnected')
        setConnectedEmail(null)
      }
    } catch (error) {
      console.error('Unexpected error checking Gmail connection:', error)
      setGmailStatus('disconnected')
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      // Sign in with Google OAuth
      await signIn('google', {
        callbackUrl: '/',  // Redirect to main dashboard after auth
        redirect: true
      })
    } catch (error) {
      console.error('Error connecting Gmail:', error)
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsConnecting(true)
    try {
      // Sign out from NextAuth (this will revoke Gmail access)
      await signOut({ redirect: false })
      setGmailStatus('disconnected')
    } catch (error) {
      console.error('Error disconnecting Gmail:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">חיבור Gmail</h3>
          <p className="text-sm text-gray-500 mt-1">
            חבר את חשבון Gmail שלך כדי לקבל לידים ישירות מהאימייל
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={checkGmailConnection}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="רענן סטטוס"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <Mail className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {gmailStatus === 'checking' ? (
              <>
                <Loader className="w-5 h-5 text-gray-400 animate-spin" />
                <span className="text-sm text-gray-600">בודק חיבור...</span>
              </>
            ) : gmailStatus === 'connected' ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">מחובר</p>
                  {connectedEmail && (
                    <p className="text-xs text-gray-500">{connectedEmail}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-gray-600">לא מחובר</span>
              </>
            )}
          </div>

          {gmailStatus === 'connected' ? (
            <button
              onClick={handleDisconnect}
              disabled={isConnecting}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {isConnecting ? 'מנתק...' : 'נתק'}
            </button>
          ) : gmailStatus === 'disconnected' ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>מתחבר...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>חבר Gmail</span>
                </>
              )}
            </button>
          ) : null}
        </div>

        {/* Features */}
        {gmailStatus === 'connected' && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">פעולות זמינות:</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                קריאת אימיילים חדשים אוטומטית
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                יצירת לידים מאימיילים שמכילים פרטי לקוח
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                סימון אימיילים כנקראו לאחר עיבוד
              </li>
            </ul>

            <div className="mt-4 space-y-2">
              <button
                onClick={async () => {
                  const response = await fetch('/api/check-gmail', { method: 'POST' })
                  const data = await response.json()
                  alert(`נבדקו ${data.processed || 0} אימיילים\nנוצרו ${data.created || 0} לידים חדשים`)
                }}
                className="w-full px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
              >
                בדוק אימיילים מ-Raion (כולל היסטוריים)
              </button>

              <p className="text-xs text-gray-500 text-center">
                בודק את כל האימיילים מ-leadmail@raion.co.il
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        {gmailStatus === 'disconnected' && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">הוראות חיבור:</h4>
            <ol className="space-y-1 text-sm text-blue-700">
              <li>1. לחץ על "חבר Gmail"</li>
              <li>2. התחבר עם חשבון Google שלך</li>
              <li>3. אשר את ההרשאות הנדרשות</li>
              <li>4. המערכת תתחיל לקרוא אימיילים חדשים אוטומטית</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}