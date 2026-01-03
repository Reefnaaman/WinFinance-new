# Domain Setup Guide for winfinance.co.il on Vercel

## Step 1: Add Domain in Vercel

1. Go to your Vercel project dashboard
2. Click on "Settings" tab
3. Click on "Domains" in the left sidebar
4. Click "Add Domain"
5. Enter: `winfinance.co.il`
6. Click "Add"

## Step 2: Choose Configuration Type

Vercel will ask how you want to configure the domain. You have two options:

### Option A: If you want to use Vercel's nameservers (Recommended - Easier)
1. Select "Vercel Nameservers"
2. Vercel will provide you with nameservers like:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
3. Go to your domain registrar (where you bought winfinance.co.il)
4. Update the nameservers to Vercel's nameservers

### Option B: If you want to keep your current DNS provider
1. Select "A Record / CNAME"
2. Vercel will provide you with DNS records to add:

   **For the root domain (winfinance.co.il):**
   - Type: A
   - Name: @ (or leave empty)
   - Value: 76.76.21.21

   **For www subdomain (www.winfinance.co.il):**
   - Type: CNAME
   - Name: www
   - Value: cname.vercel-dns.com

3. Go to your DNS provider and add these records

## Step 3: Wait for DNS Propagation

- DNS changes can take up to 48 hours to propagate globally
- Usually it works within 30 minutes to 2 hours
- You can check propagation status at: https://www.whatsmydns.net/

## Step 4: SSL Certificate

- Vercel automatically provisions SSL certificates once DNS is configured
- This happens automatically within a few minutes after DNS verification

## Step 5: Update Environment Variables

Once the domain is configured, update your environment variables:

1. In Vercel Settings → Environment Variables
2. Update or add:
   ```
   NEXTAUTH_URL=https://winfinance.co.il
   ```

3. For development/preview environments, you might want different values:
   - Production: `https://winfinance.co.il`
   - Preview: Use the Vercel preview URL
   - Development: `http://localhost:3010`

## Step 6: Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to your project → APIs & Services → Credentials
3. Click on your OAuth 2.0 Client ID
4. Add these Authorized redirect URIs:
   - `https://winfinance.co.il/api/auth/callback/google`
   - `https://www.winfinance.co.il/api/auth/callback/google`
5. Save the changes

## Verification Checklist

- [ ] Domain added to Vercel project
- [ ] DNS records configured (either nameservers or A/CNAME records)
- [ ] SSL certificate issued (shown as "Valid" in Vercel)
- [ ] NEXTAUTH_URL environment variable updated
- [ ] Google OAuth redirect URIs added
- [ ] Site accessible at https://winfinance.co.il

## Troubleshooting

### Domain not verifying?
- Check DNS propagation: https://www.whatsmydns.net/
- Ensure records are exactly as Vercel specifies
- If using .co.il domain, some registrars have special requirements

### SSL Certificate not issued?
- Usually automatic after DNS verification
- Can take up to 24 hours
- Check Vercel dashboard for any error messages

### OAuth not working on production?
- Ensure NEXTAUTH_URL is set to https://winfinance.co.il (not http)
- Verify Google OAuth redirect URIs are added
- Check browser console for specific error messages

## Israeli Domain (.co.il) Specific Notes

If your domain is registered with an Israeli registrar:
1. Some registrars like ISOC-IL have specific DNS management interfaces
2. You might need to contact support for nameserver changes
3. .co.il domains sometimes take longer for DNS propagation

## Current Vercel Deployment URL

While waiting for the domain setup, your app is available at:
- Look in Vercel dashboard for the auto-generated URL (e.g., `your-project.vercel.app`)
- You can use this URL for testing while setting up the custom domain