-- Migration: Use Supabase Storage for File Processing
-- Replaces file_content TEXT with file_path TEXT to store files in Supabase Storage
-- This fixes the FUNCTION_PAYLOAD_TOO_LARGE error by avoiding large payloads

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================

-- Create storage bucket for temporary file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('file-uploads', 'file-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- UPDATE TABLE SCHEMA
-- ============================================================================

-- Add file_path column
ALTER TABLE file_processing_jobs
ADD COLUMN IF NOT EXISTS file_path TEXT;

-- For existing rows, mark them as failed since we can't recover the file content
-- New uploads will use file_path
UPDATE file_processing_jobs
SET status = 'failed',
    error_message = 'Migration: file content moved to storage'
WHERE file_path IS NULL AND status != 'completed';

-- Make file_path required for new rows
-- We keep file_content as nullable for backward compatibility during transition
ALTER TABLE file_processing_jobs
ALTER COLUMN file_content DROP NOT NULL;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Note: Storage policies need to be created through the Supabase Dashboard or using
-- the storage API. The policies below are for reference only.
--
-- Required policies for the 'file-uploads' bucket:
-- 1. Service role has full access (automatically granted)
-- 2. Authenticated users can upload files to their own folder:
--    - Operation: INSERT
--    - Policy: bucket_id = 'file-uploads' AND (storage.foldername(name))[1] = auth.uid()::text
-- 3. Authenticated users can read their own files:
--    - Operation: SELECT
--    - Policy: bucket_id = 'file-uploads' AND (storage.foldername(name))[1] = auth.uid()::text
--
-- These policies should be configured in the Supabase Dashboard under Storage > Policies
-- or applied via the storage configuration in your project settings.

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

-- Function to cleanup old uploaded files after processing
CREATE OR REPLACE FUNCTION cleanup_processed_files()
RETURNS void AS $$
BEGIN
  -- Delete files from storage for completed jobs older than 24 hours
  DELETE FROM storage.objects
  WHERE bucket_id = 'file-uploads'
    AND created_at < NOW() - INTERVAL '24 hours'
    AND name IN (
      SELECT file_path
      FROM file_processing_jobs
      WHERE status = 'completed'
        AND completed_at < NOW() - INTERVAL '24 hours'
    );

  -- Delete files for failed jobs older than 7 days
  DELETE FROM storage.objects
  WHERE bucket_id = 'file-uploads'
    AND created_at < NOW() - INTERVAL '7 days'
    AND name IN (
      SELECT file_path
      FROM file_processing_jobs
      WHERE status = 'failed'
        AND updated_at < NOW() - INTERVAL '7 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN file_processing_jobs.file_path IS
  'Path to file in Supabase Storage (bucket: file-uploads)';

COMMENT ON FUNCTION cleanup_processed_files IS
  'Cleans up old uploaded files from storage after processing is complete';
