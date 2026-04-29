import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    })
  ],

  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        console.log('[gmail-auth] Initial sign in, saving tokens...', {
          email: user.email,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          scope: account.scope,
          expiresAt: account.expires_at,
        })

        // Save Gmail tokens. Persist whenever an access token is present.
        // Google only returns refresh_token on the first consent; on subsequent
        // re-authorizations it is often omitted even with prompt=consent. In
        // that case we keep whatever refresh_token is already on file so the
        // server can keep refreshing the access token in the background.
        if (account.access_token && user.email) {
          const supabase = getSupabaseClient()
          const tokenExpiry = account.expires_at
            ? new Date(account.expires_at * 1000).toISOString()
            : new Date(Date.now() + 3600 * 1000).toISOString()

          let refreshTokenToStore = account.refresh_token as string | undefined

          if (!refreshTokenToStore) {
            const { data: existing } = await supabase
              .from('gmail_tokens')
              .select('refresh_token')
              .eq('user_email', user.email)
              .maybeSingle()
            if (existing?.refresh_token) {
              refreshTokenToStore = existing.refresh_token
              console.log('[gmail-auth] Google omitted refresh_token; preserving existing one on file')
            } else {
              console.warn('[gmail-auth] No refresh_token from Google AND none on file — background refresh will not work until the user revokes access at myaccount.google.com/permissions and reconnects')
            }
          }

          const upsertPayload: Record<string, unknown> = {
            user_email: user.email,
            access_token: account.access_token,
            token_expiry: tokenExpiry,
            scope: account.scope || '',
            updated_at: new Date().toISOString(),
          }
          if (refreshTokenToStore) {
            upsertPayload.refresh_token = refreshTokenToStore
          }

          const { error } = await supabase
            .from('gmail_tokens')
            .upsert(upsertPayload, { onConflict: 'user_email' })

          if (error) {
            console.error('[gmail-auth] Error saving Gmail tokens:', error)
          } else {
            console.log('[gmail-auth] Gmail tokens saved successfully for', user.email)
          }
        } else {
          console.error('[gmail-auth] Skipping save — missing access_token or user.email', {
            hasAccessToken: !!account.access_token,
            email: user.email,
          })
        }

        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
          user
        }
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token
      }

      // Access token has expired, try to update it
      console.log('Access token expired, refreshing...')
      return refreshAccessToken(token)
    },

    async session({ session, token }: any) {
      session.accessToken = token.accessToken as string | undefined
      session.error = token.error as string | undefined

      // Add Gmail connection status
      if (session.user?.email) {
        const supabase = getSupabaseClient()
        const { data } = await supabase
          .from('gmail_tokens')
          .select('token_expiry')
          .eq('user_email', session.user.email)
          .single()

        session.gmailConnected = !!data && new Date(data.token_expiry) > new Date()
      }

      return session
    }
  },

  pages: {
    signIn: '/login',
    error: '/auth/error'
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: true // Enable debug mode to see what's happening
})

async function refreshAccessToken(token: any) {
  try {
    const url = 'https://oauth2.googleapis.com/token'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    // Update tokens in database
    if (token.user?.email) {
      const supabase = getSupabaseClient()
      const tokenExpiry = refreshedTokens.expires_in
        ? new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString()

      await supabase
        .from('gmail_tokens')
        .update({
          access_token: refreshedTokens.access_token,
          token_expiry: tokenExpiry,
          updated_at: new Date().toISOString()
        })
        .eq('user_email', token.user.email)
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    }
  } catch (error) {
    console.error('Error refreshing access token:', error)

    return {
      ...token,
      error: 'RefreshAccessTokenError',
    }
  }
}

export { handler as GET, handler as POST }