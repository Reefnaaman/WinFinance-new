import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientAuthProvider from "@/components/ClientAuthProvider";
import NextAuthSessionProvider from "@/components/providers/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WinFinance - Lead Management",
  description: "Lead management system for WinFinance",
  icons: {
    icon: '/winfinance-logo-no-text.png',
    apple: '/winfinance-logo-no-text.png',
    shortcut: '/winfinance-logo-no-text.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <NextAuthSessionProvider>
          <ClientAuthProvider>
            {children}
          </ClientAuthProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
