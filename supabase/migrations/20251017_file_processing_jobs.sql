-- File Processing Jobs Migration
-- Creates a table for individual file processing jobs that can be polled by workers
-- This replaces pg-boss for better serverless compatibility

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
