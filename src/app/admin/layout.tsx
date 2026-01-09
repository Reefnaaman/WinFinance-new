'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { SessionProvider } from 'next-auth/react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </SessionProvider>
  )
}