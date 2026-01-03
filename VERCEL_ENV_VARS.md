# Vercel Environment Variables Setup

Add these environment variables in your Vercel project settings:

## Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=[Your Supabase URL from .env.local]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Your Supabase Anon Key from .env.local]
SUPABASE_SERVICE_ROLE_KEY=[Your Supabase Service Role Key from .env.local]
GOOGLE_CLIENT_ID=[Your Google Client ID from .env.local]
GOOGLE_CLIENT_SECRET=[Your Google Client Secret from .env.local]
NEXTAUTH_URL=[Use your-project.vercel.app URL until domain is set up, then https://winfinance.co.il]
NEXTAUTH_SECRET=[Your NextAuth Secret from .env.local]
WEBHOOK_SECRET=[Generate a secure webhook secret]
```

**Note**: Copy the actual values from your `.env.local` file when setting up in Vercel.

## Important Notes:

1. **NEXTAUTH_URL**:
   - Initially use your Vercel deployment URL (e.g., `https://your-project.vercel.app`)
   - Update to `https://winfinance.co.il` once domain is configured
   - Find your Vercel URL in the Vercel dashboard after deployment

2. **NEXTAUTH_SECRET**: Keep the same secret across environments

3. **Google OAuth**: Add these to your Google Cloud Console authorized redirect URIs:
   - For testing: `https://your-project.vercel.app/api/auth/callback/google`
   - For production: `https://winfinance.co.il/api/auth/callback/google`

## How to Add in Vercel:

1. Go to your Vercel project dashboard
2. Click on "Settings" tab
3. Click on "Environment Variables" in the left sidebar
4. Add each variable one by one
5. Make sure to select "Production", "Preview", and "Development" for each variable
6. Click "Save" after adding all variables
7. Redeploy your project for changes to take effect