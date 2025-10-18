-- Upload Jobs Migration
-- This migration creates infrastructure for handling ZIP uploads with multiple JSON files
-- and tracking batch processing jobs

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Upload job status enum
DO $$ BEGIN
  CREATE TYPE upload_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Upload jobs table for tracking ZIP upload processing
CREATE TABLE IF NOT EXISTS upload_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status upload_job_status NOT NULL DEFAULT 'pending',
  filename TEXT NOT NULL,
  total_files INT NOT NULL DEFAULT 0,
  processed_files INT NOT NULL DEFAULT 0,
  total_records INT NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for filtering jobs by user
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_upload_jobs_user_id ON upload_jobs(user_id);
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

-- Index for filtering jobs by status
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_upload_jobs_status ON upload_jobs(status);
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

-- Composite index for user's recent uploads
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_upload_jobs_user_created ON upload_jobs(user_id, created_at DESC);
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on upload_jobs table
ALTER TABLE upload_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own upload jobs
DO $$ BEGIN
  CREATE POLICY "Users can view own upload jobs" ON upload_jobs
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Policy: Users can create their own upload jobs
DO $$ BEGIN
  CREATE POLICY "Users can create own upload jobs" ON upload_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Policy: Service role can update upload jobs (for background workers)
DO $$ BEGIN
  CREATE POLICY "Service role can update upload jobs" ON upload_jobs
    FOR UPDATE USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on upload_jobs
DO $$ BEGIN
  CREATE TRIGGER update_upload_jobs_updated_at
    BEFORE UPDATE ON upload_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE upload_jobs IS
  'Tracks ZIP upload processing jobs with multiple JSON files for batch ingestion';

COMMENT ON COLUMN upload_jobs.id IS
  'Unique identifier for the upload job';

COMMENT ON COLUMN upload_jobs.user_id IS
  'User who initiated the upload';

COMMENT ON COLUMN upload_jobs.status IS
  'Current status of the upload job (pending, processing, completed, failed)';

COMMENT ON COLUMN upload_jobs.filename IS
  'Original filename of the uploaded ZIP file';

COMMENT ON COLUMN upload_jobs.total_files IS
  'Total number of JSON files found in the ZIP';

COMMENT ON COLUMN upload_jobs.processed_files IS
  'Number of JSON files successfully processed';

COMMENT ON COLUMN upload_jobs.total_records IS
  'Total number of listening records inserted across all files';

COMMENT ON COLUMN upload_jobs.error_message IS
  'Error message if the job failed';
