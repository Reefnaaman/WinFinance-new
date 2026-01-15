# Gmail Push Notifications Setup Guide

## 1. Add to your .env.local file:

```
# Google Pub/Sub Topic (from Step 3)
GOOGLE_PUBSUB_TOPIC=projects/YOUR-PROJECT-ID/topics/gmail-push

# Your app URL (for webhook callbacks)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## 2. Run this SQL in Supabase:

```sql
CREATE TABLE IF NOT EXISTS gmail_watch (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  history_id TEXT,
  expiration TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 3. Deploy to Vercel:

```bash
git add -A
git commit -m "Add Gmail push notifications"
git push
```

## 4. Update Google Cloud Subscription:

1. Go back to Google Cloud Console
2. Find your subscription
3. Update the endpoint URL to your REAL Vercel URL:
   `https://YOUR-VERCEL-APP.vercel.app/api/gmail/webhook`

## 5. Activate Gmail Watch:

Once deployed, make a POST request to:
`https://YOUR-VERCEL-APP.vercel.app/api/gmail/setup-watch`

Or create a button in your Settings UI that calls this endpoint.

## 6. Test It:

1. Send yourself a test email
2. Within 1-2 seconds, check your database
3. The lead should appear instantly!

## Important Notes:

- Watch expires every 7 days (Google limitation)
- You need to renew it by calling setup-watch again
- Can automate renewal with a weekly cron job

## Troubleshooting:

If not working:
1. Check Vercel Function logs for errors
2. Verify Pub/Sub permissions (Step 5)
3. Make sure webhook URL is HTTPS
4. Check that Google Cloud APIs are enabled
5. Verify topic name matches exactly