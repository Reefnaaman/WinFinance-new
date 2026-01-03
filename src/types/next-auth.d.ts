import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    error?: string
    gmailConnected?: boolean
    user: {
      email?: string | null
      name?: string | null
      image?: string | null
    } & DefaultSession['user']
  }

  interface JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
    user?: {
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}