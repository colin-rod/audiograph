# Serverless Queue Migration Guide

## Overview

This migration replaces pg-boss with a simpler database polling approach to fix compatibility issues with serverless platforms like Vercel. pg-boss requires a persistent database connection, which doesn't work in Vercel's ephemeral serverless functions.

## What Changed

### Before
- Vercel API routes tried to initialize pg-boss on every request
- pg-boss needed persistent connections and created its own tables
- Resulted in errors: "Queue does not exist" and JSON parse errors

### After
- Vercel API routes insert jobs directly into `file_processing_jobs` table
- Railway worker polls the database for pending jobs
- No pg-boss initialization in serverless environment

## Deployment Steps

### 1. Apply Database Migration

You need to create the `file_processing_jobs` table in Supabase. Run this SQL in the Supabase SQL Editor:

```sql
-- File Processing Jobs Migration
-- Creates a table for individual file processing jobs that can be polled by workers

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- File processing job status enum
DO $$ BEGIN
  CREATE TYPE file_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- File processing jobs table
CREATE TABLE IF NOT EXISTS file_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_job_id UUID NOT NULL REFERENCES upload_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_content TEXT NOT NULL,
  file_index INT NOT NULL,
  total_files INT NOT NULL,
  status file_job_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for workers to find pending jobs
CREATE INDEX idx_file_jobs_status_created ON file_processing_jobs(status, created_at);

-- Index for filtering by upload job
CREATE INDEX idx_file_jobs_upload_job ON file_processing_jobs(upload_job_id);

-- Index for finding stale jobs (processing for too long)
CREATE INDEX idx_file_jobs_stale ON file_processing_jobs(status, started_at)
  WHERE status = 'processing';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE file_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Service role can do anything (for workers)
CREATE POLICY "Service role full access" ON file_processing_jobs
  USING (true)
  WITH CHECK (true);

-- Users can view their own jobs
CREATE POLICY "Users can view own jobs" ON file_processing_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE TRIGGER update_file_jobs_updated_at
  BEFORE UPDATE ON file_processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS FOR WORKER POLLING
-- ============================================================================

-- Function to claim a batch of pending jobs atomically
-- Returns up to batch_size pending jobs and marks them as processing
CREATE OR REPLACE FUNCTION claim_pending_jobs(batch_size INT DEFAULT 1)
RETURNS SETOF file_processing_jobs AS $$
BEGIN
  RETURN QUERY
  UPDATE file_processing_jobs
  SET
    status = 'processing',
    started_at = NOW(),
    updated_at = NOW()
  WHERE id IN (
    SELECT id
    FROM file_processing_jobs
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Function to reset stale jobs (processing for > 10 minutes)
-- This handles worker crashes
CREATE OR REPLACE FUNCTION reset_stale_jobs()
RETURNS TABLE(reset_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH reset_jobs AS (
    UPDATE file_processing_jobs
    SET
      status = CASE
        WHEN retry_count >= max_retries THEN 'failed'::file_job_status
        ELSE 'pending'::file_job_status
      END,
      retry_count = retry_count + 1,
      error_message = CASE
        WHEN retry_count >= max_retries
        THEN 'Job stalled and exceeded max retries'
        ELSE error_message
      END,
      started_at = NULL,
      updated_at = NOW()
    WHERE
      status = 'processing'
      AND started_at < NOW() - INTERVAL '10 minutes'
    RETURNING 1
  )
  SELECT COUNT(*)::BIGINT FROM reset_jobs;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE file_processing_jobs IS
  'Individual file processing jobs for background workers to poll and process';

COMMENT ON FUNCTION claim_pending_jobs IS
  'Atomically claims pending jobs for processing using row-level locks';

COMMENT ON FUNCTION reset_stale_jobs IS
  'Resets jobs that have been processing for too long (handles worker crashes)';
```

### 2. Deploy to Vercel

Push the code and Vercel will automatically deploy:

```bash
git push
```

The Vercel deployment now:
- No longer tries to initialize pg-boss
- Inserts jobs directly into `file_processing_jobs` table
- Returns proper JSON errors instead of HTML error pages

### 3. Redeploy Railway Worker

The Railway worker now uses the new polling system. Redeploy it:

1. Go to Railway dashboard
2. Select your worker service
3. Click "Deploy" or push to trigger a new deployment

The worker will:
- Poll the database every 2 seconds for pending jobs
- Process up to 5 jobs concurrently
- Reset stale jobs every minute (handles crashes)
- Automatically retry failed jobs (up to 3 times)

### 4. Update Environment Variables (if needed)

Make sure these environment variables are set in Railway:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No DATABASE_URL is needed anymore since we're using the Supabase client directly.

## How It Works

### Job Flow

1. **User uploads JSON files**
   - Frontend sends files to `/api/uploads/json`
   - API validates files and reads content

2. **API creates jobs**
   - Creates one `upload_jobs` record (tracks overall progress)
   - Creates multiple `file_processing_jobs` records (one per file)
   - Returns uploadJobId to frontend

3. **Worker processes jobs**
   - Polls database using `claim_pending_jobs()` function
   - Atomically claims pending jobs (prevents duplicate processing)
   - Processes each file (parse JSON, insert into `listens` table)
   - Updates job status to `completed` or `failed`
   - Updates upload job progress

4. **Frontend monitors progress**
   - Polls `/api/uploads/[uploadId]/status` every 2 seconds
   - Shows progress bar based on processed files
   - Redirects to dashboard when complete

### Error Handling

- **API errors**: Return proper JSON with error messages
- **Worker crashes**: Stale jobs (processing > 10 min) are reset automatically
- **Retry logic**: Failed jobs retry up to 3 times with exponential backoff
- **File validation**: Invalid files are rejected before job creation

## Benefits

✅ **Serverless Compatible**: No persistent connections needed in Vercel
✅ **Simpler Architecture**: No pg-boss dependency, just database polling
✅ **Better Error Handling**: Proper JSON errors, detailed logging
✅ **Crash Resistant**: Automatic stale job recovery
✅ **Scalable**: Multiple workers can poll concurrently (SKIP LOCKED)

## Monitoring

Check worker logs in Railway:
```bash
railway logs -s <worker-service-name>
```

Check for stale jobs in Supabase:
```sql
SELECT * FROM file_processing_jobs
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '10 minutes';
```

Check failed jobs:
```sql
SELECT * FROM file_processing_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

## Rollback

If you need to rollback:

1. Revert the code: `git revert HEAD`
2. Drop the new table: `DROP TABLE file_processing_jobs CASCADE;`
3. Drop the functions: `DROP FUNCTION claim_pending_jobs, reset_stale_jobs;`
4. Redeploy both Vercel and Railway

## Next Steps

After deployment:
1. Test file upload with a small JSON file
2. Monitor Railway worker logs to see job processing
3. Check Supabase `file_processing_jobs` table for job status
4. Verify frontend shows progress correctly
