# Supabase Edge Functions Setup

## Overview

This guide explains how to migrate from Railway worker to Supabase Edge Functions for file processing. This eliminates the need for Railway entirely and keeps all infrastructure within Supabase.

## Benefits

✅ **No Railway costs** - Everything runs on Supabase
✅ **Simpler architecture** - One less service to manage
✅ **Better integration** - Direct access to Supabase database
✅ **Auto-scaling** - Edge Functions scale automatically
✅ **Global distribution** - Runs close to your users

## Prerequisites

1. Supabase project (already set up)
2. Supabase CLI installed (`brew install supabase/tap/supabase`)
3. Docker Desktop running (required for local testing)

## Step 1: Apply Database Migration

First, create the `file_processing_jobs` table by running this SQL in the Supabase SQL Editor:

```sql
-- Copy the entire contents of supabase/migrations/20251017_file_processing_jobs.sql
```

Or use the CLI:

```bash
supabase db push
```

## Step 2: Deploy the Edge Function

### 2.1 Login to Supabase CLI

```bash
supabase login
```

### 2.2 Link to your project

```bash
supabase link --project-ref btgvrkfujiqwqbshcity
```

### 2.3 Deploy the function

```bash
supabase functions deploy process-files
```

This will deploy the Edge Function from `supabase/functions/process-files/index.ts`.

### 2.4 Verify deployment

Check that the function is deployed:

```bash
supabase functions list
```

You should see `process-files` in the list.

## Step 3: Set Up Cron Job (Optional but Recommended)

To automatically process pending jobs every minute, create a cron job in Supabase:

### 3.1 Create the cron extension

Run this SQL in the Supabase SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
```

### 3.2 Create the cron job

```sql
-- Create a cron job that runs every minute
SELECT cron.schedule(
  'process-file-jobs',              -- Job name
  '* * * * *',                      -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://btgvrkfujiqwqbshcity.supabase.co/functions/v1/process-files',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
  $$
);
```

**Note:** Replace `btgvrkfujiqwqbshcity` with your actual project ref.

### 3.3 Set the service role key

```sql
-- Store service role key securely
ALTER DATABASE postgres SET app.settings.service_role_key TO 'your-service-role-key-here';
```

**Important:** Get your service role key from Supabase Dashboard → Settings → API

### 3.4 Verify the cron job

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- Check recent job runs
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

## Step 4: Test the Setup

### 4.1 Test manually

You can trigger the Edge Function manually to test:

```bash
curl -i --location --request POST \
  'https://btgvrkfujiqwqbshcity.supabase.co/functions/v1/process-files' \
  --header 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  --header 'Content-Type: application/json'
```

### 4.2 Upload a test file

1. Go to your app's upload page
2. Upload a small JSON file
3. Check the Supabase logs to see the Edge Function processing it

```bash
supabase functions logs process-files
```

### 4.3 Check job status

```sql
-- Check file processing jobs
SELECT * FROM file_processing_jobs
ORDER BY created_at DESC
LIMIT 10;

-- Check upload jobs
SELECT * FROM upload_jobs
ORDER BY created_at DESC
LIMIT 10;
```

## Step 5: Update Environment Variables

No changes needed! The existing environment variables work:

- `NEXT_PUBLIC_SUPABASE_URL` - Already set
- `SUPABASE_SERVICE_ROLE_KEY` - Already set in Vercel

The API route will automatically trigger the Edge Function.

## Step 6: Remove Railway (Optional)

Once you've verified everything works:

1. Stop the Railway worker service
2. Delete the Railway project (or just the worker service)
3. Remove unused files:
   - `src/workers/upload-processor.ts` (old pg-boss worker)
   - `src/workers/file-processor.ts` (old database polling worker)
   - `src/lib/queue/client.ts` (pg-boss client)

## How It Works

### Architecture Flow

```
User uploads JSON files
         ↓
Vercel API route (/api/uploads/json)
         ↓
Creates records in file_processing_jobs table
         ↓
Triggers Edge Function (process-files)
         ↓
Edge Function processes pending jobs
         ↓
Updates upload_jobs progress
         ↓
Frontend polls /api/uploads/[id]/status
         ↓
Shows progress to user
```

### Edge Function Behavior

1. **Reset stale jobs** - Jobs processing for >10 minutes are reset
2. **Claim pending jobs** - Atomically claims up to 5 jobs using `SKIP LOCKED`
3. **Process each job**:
   - Parse JSON content
   - Insert records into `listens` table in batches of 500
   - Update `upload_jobs` progress
   - Refresh analytics views when complete
4. **Handle errors**:
   - Retry failed jobs up to 3 times
   - Mark as failed after max retries

### Cron Job (Optional)

If you set up the cron job:
- Runs every minute
- Triggers the Edge Function automatically
- Ensures pending jobs don't sit idle
- No need for API to trigger (but it still does for immediate processing)

## Monitoring

### View Edge Function logs

```bash
# Real-time logs
supabase functions logs process-files --tail

# Last 100 lines
supabase functions logs process-files --limit 100
```

### Check for stuck jobs

```sql
-- Jobs stuck in processing state
SELECT * FROM file_processing_jobs
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '10 minutes';

-- Failed jobs
SELECT * FROM file_processing_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Monitor cron job (if using)

```sql
-- Recent cron job executions
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-file-jobs')
ORDER BY start_time DESC
LIMIT 10;
```

## Troubleshooting

### Edge Function not deploying

```bash
# Check Supabase CLI version
supabase --version

# Update if needed
brew upgrade supabase

# Try deploying with verbose output
supabase functions deploy process-files --debug
```

### Jobs not processing

1. Check Edge Function logs: `supabase functions logs process-files`
2. Verify cron job is running: `SELECT * FROM cron.job_run_details`
3. Manually trigger the function to test
4. Check for pending jobs: `SELECT * FROM file_processing_jobs WHERE status = 'pending'`

### Database migration errors

If the migration fails:

```bash
# Check migration status
supabase migration list

# Repair if needed
supabase migration repair

# Pull remote state
supabase db pull
```

## Cost Comparison

### Railway (Previous)
- Worker service: ~$5-10/month
- Database: Included in Supabase
- **Total: $5-10/month**

### Supabase Edge Functions (New)
- Edge Functions: Free tier includes 500K requests/month
- 2M executions = $2/month
- Database: Already included
- **Total: $0-2/month**

💰 **Savings: $3-8/month** (plus simpler architecture!)

## Next Steps

1. Deploy the Edge Function
2. Set up the cron job (optional but recommended)
3. Test with a file upload
4. Monitor for a few days
5. Remove Railway once confident
