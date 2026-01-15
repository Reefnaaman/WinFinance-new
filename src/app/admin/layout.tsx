import type { Metadata } from 'next'
import AdminProviders from './providers'

export const metadata: Metadata = {
  title: 'WinFinance Admin | ניהול לידים',
  description: 'מערכת ניהול לידים וסוכנים - WinFinance',
  icons: {
    icon: [
      { url: "/winfinance-logo-no-text.png", sizes: "any" },
      { url: "/winfinance-logo-no-text.png", sizes: "32x32" },
      { url: "/winfinance-logo-no-text.png", sizes: "16x16" },
    ],
    apple: "/winfinance-logo-no-text.png",
    shortcut: "/winfinance-logo-no-text.png",
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminProviders>
      {children}
    </AdminProviders>
  )
}