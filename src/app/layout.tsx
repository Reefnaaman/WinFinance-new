import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "WinFinance | פתרונות פיננסיים מקיפים",
  description: "חברת פתרונות פיננסיים המתמחה בתכנון פיננסי, פרישה וביטוח. שירותים מקיפים ללקוחות פרטיים ועסקיים.",
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WinFinance",
  },
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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl">
      <body
        className={`font-sans antialiased`}
        suppressHydrationWarning
      >
        {children}
        <Analytics />
      </body>
    </html>
  )
}
