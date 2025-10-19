# Automated Spotify Enrichment

This guide explains how to set up automatic enrichment of listening data with Spotify metadata.

## Table of Contents
- [Overview](#overview)
- [Options](#options)
- [Option 1: Scheduled Cron Job](#option-1-scheduled-cron-job)
- [Option 2: Post-Upload Trigger](#option-2-post-upload-trigger)
- [Option 3: Background Worker](#option-3-background-worker)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Overview

You have three main options for automating enrichment:

1. **Scheduled Cron Job** - Runs at fixed intervals (e.g., every hour)
2. **Post-Upload Trigger** - Automatically enriches after new data uploads
3. **Background Worker** - Continuous processing with queue management

## Options

### Comparison

| Option | Pros | Cons | Best For |
|--------|------|------|----------|
| Cron Job | Simple, predictable | Fixed schedule, may process empty queues | Regular maintenance |
| Post-Upload | Immediate, efficient | Only runs after uploads | Active users |
| Background Worker | Continuous, scalable | More complex setup | High-volume apps |

---

## Option 1: Scheduled Cron Job

### Using Supabase pg_cron

**Setup Steps:**

1. **Deploy the Edge Function:**
   ```bash
   npx supabase functions deploy spotify-enrichment
   ```

2. **Add Environment Variables** in Supabase Dashboard:
   - Go to Project Settings → Edge Functions
   - Add secrets:
     ```
     SPOTIFY_CLIENT_ID=your_client_id
     SPOTIFY_CLIENT_SECRET=your_client_secret
     ```

3. **Enable pg_cron Extension:**
   - Go to Database → Extensions
   - Search for "pg_cron"
   - Click "Enable"

4. **Create Cron Job:**

   In Supabase SQL Editor, run:

   ```sql
   -- Schedule enrichment every hour
   SELECT cron.schedule(
     'spotify-enrichment-hourly',
     '0 * * * *',
     $$
     SELECT net.http_post(
       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/spotify-enrichment',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || current_setting('app.settings.anon_key')
       ),
       body := jsonb_build_object('batch_size', 50)
     );
     $$
   );
   ```

   Replace `YOUR_PROJECT_REF` with your actual project reference.

5. **Set the anon key** (one-time setup):
   ```sql
   ALTER DATABASE postgres SET app.settings.anon_key = 'your-anon-key-here';
   ```

### Alternative: Using Vercel Cron (if deployed on Vercel)

1. **Create API Route** (`src/app/api/cron/enrich/route.ts`):

   ```typescript
   import { enrichListens } from '@/lib/spotify/enrichment'
   import { NextResponse } from 'next/server'

   export const dynamic = 'force-dynamic'
   export const maxDuration = 300

   export async function GET(request: Request) {
     // Verify cron secret
     const authHeader = request.headers.get('authorization')
     if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
     }

     try {
       const stats = await enrichListens(100)
       return NextResponse.json({ success: true, stats })
     } catch (error) {
       return NextResponse.json(
         { error: error instanceof Error ? error.message : 'Failed' },
         { status: 500 }
       )
     }
   }
   ```

2. **Add to `vercel.json`:**
   ```json
   {
     "crons": [{
       "path": "/api/cron/enrich",
       "schedule": "0 * * * *"
     }]
   }
   ```

3. **Set Environment Variable:**
   - Add `CRON_SECRET` in Vercel dashboard
   - Generate a random secret: `openssl rand -base64 32`

---

## Option 2: Post-Upload Trigger

Automatically enrich data immediately after uploads complete.

### Implementation

1. **Modify Upload Completion Handler:**

   In `src/app/api/uploads/[uploadId]/status/route.ts` (or wherever uploads complete):

   ```typescript
   // After upload is marked as completed
   if (uploadJob.status === 'completed') {
     // Trigger enrichment in background (don't await)
     fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/spotify-enrichment`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
       },
       body: JSON.stringify({ batch_size: 100 }),
     }).catch(err => console.error('Failed to trigger enrichment:', err))
   }
   ```

2. **Or use Database Trigger:**

   ```sql
   -- Create function to call Edge Function
   CREATE OR REPLACE FUNCTION trigger_enrichment()
   RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
       PERFORM net.http_post(
         url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/spotify-enrichment',
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer YOUR_ANON_KEY'
         ),
         body := jsonb_build_object('batch_size', 50)
       );
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   -- Create trigger
   CREATE TRIGGER upload_completed_enrichment
   AFTER UPDATE ON upload_jobs
   FOR EACH ROW
   EXECUTE FUNCTION trigger_enrichment();
   ```

---

## Option 3: Background Worker

For continuous processing with a queue.

### Using Inngest (Recommended for Complex Workflows)

1. **Install Inngest:**
   ```bash
   npm install inngest
   ```

2. **Create Worker** (`src/inngest/enrichment.ts`):

   ```typescript
   import { inngest } from './client'
   import { enrichListens } from '@/lib/spotify/enrichment'

   export const enrichmentWorker = inngest.createFunction(
     { id: 'spotify-enrichment', retries: 3 },
     { cron: '0 * * * *' }, // Every hour
     async ({ step }) => {
       const stats = await step.run('enrich-batch', async () => {
         return await enrichListens(100)
       })

       return { success: true, stats }
     }
   )
   ```

3. **Setup Inngest** (see Inngest docs for full setup)

### Using BullMQ (For Redis-based Queues)

1. **Install BullMQ:**
   ```bash
   npm install bullmq ioredis
   ```

2. **Setup Queue** - See BullMQ docs for configuration

---

## Monitoring

### Check Enrichment Progress

**Via SQL:**
```sql
SELECT
  COUNT(*) as total_listens,
  COUNT(*) FILTER (WHERE spotify_track_id IS NOT NULL) as enriched,
  ROUND(COUNT(*) FILTER (WHERE spotify_track_id IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 1) as percentage
FROM listens
WHERE user_id = 'your-user-id';
```

**Via API:**
```bash
curl https://your-app.vercel.app/api/spotify/enrich
```

**Via Dashboard Component:**
```tsx
import { SpotifyEnrichment } from '@/components/dashboard/spotify-enrichment'
```

### View Cron Job Logs

**Supabase pg_cron:**
```sql
SELECT * FROM cron.job_run_details
WHERE jobname = 'spotify-enrichment-hourly'
ORDER BY start_time DESC
LIMIT 10;
```

**Edge Function Logs:**
- Go to Supabase Dashboard → Edge Functions → spotify-enrichment → Logs

### Set Up Alerts

**Monitor Failures:**
```sql
-- Alert if enrichment hasn't run in 2 hours
SELECT
  CASE
    WHEN MAX(enriched_at) < NOW() - INTERVAL '2 hours' THEN
      'WARNING: Enrichment has not run recently'
    ELSE
      'OK'
  END as status
FROM listens
WHERE enriched_at IS NOT NULL;
```

---

## Troubleshooting

### Cron Job Not Running

**Check if job exists:**
```sql
SELECT * FROM cron.job WHERE jobname = 'spotify-enrichment-hourly';
```

**Check recent runs:**
```sql
SELECT * FROM cron.job_run_details
WHERE jobname = 'spotify-enrichment-hourly'
ORDER BY start_time DESC
LIMIT 5;
```

**Check pg_cron is enabled:**
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

### Edge Function Failing

**Check logs:**
- Supabase Dashboard → Edge Functions → spotify-enrichment → Logs

**Common issues:**
- Missing environment variables (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`)
- Invalid Spotify tokens
- Rate limiting

**Test manually:**
```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/spotify-enrichment \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 10}'
```

### Rate Limiting

**Spotify API limits: ~180 requests/min**

**If hitting limits:**
- Reduce `batch_size` in cron job
- Increase cron interval (e.g., every 2 hours instead of hourly)
- Add more delay between requests (currently 350ms)

### Token Refresh Failing

**Check token expiry:**
```sql
SELECT user_id, expires_at, expires_at < NOW() as is_expired
FROM spotify_tokens;
```

**Force token refresh:**
- User signs out and signs in with Spotify again

---

## Best Practices

1. **Start Conservative**
   - Begin with small batches (50 records)
   - Run less frequently (every 6 hours)
   - Scale up as needed

2. **Monitor Costs**
   - Spotify API is free but rate-limited
   - Edge Function execution time (first 500K requests free)
   - Database operations

3. **Handle Failures Gracefully**
   - Unenriched records remain in queue for next run
   - Failed enrichments are skipped (not retried automatically)
   - Monitor logs for patterns

4. **User Experience**
   - Show enrichment progress in UI
   - Allow manual trigger for immediate enrichment
   - Don't block user actions on enrichment

5. **Privacy**
   - Only enrich data for users with valid Spotify tokens
   - Respect user's token revocation

---

## Recommended Setup

**For Most Users:**
1. Deploy Edge Function
2. Set up hourly cron job
3. Also trigger enrichment after uploads
4. Monitor via dashboard component

**Command Summary:**
```bash
# 1. Deploy Edge Function
npx supabase functions deploy spotify-enrichment

# 2. Set secrets in Supabase dashboard

# 3. Run SQL to create cron job (see above)

# 4. Monitor via UI or SQL
```

---

## Additional Resources

- [Supabase Cron Jobs](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Spotify API Rate Limits](https://developer.spotify.com/documentation/web-api/concepts/rate-limits)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
