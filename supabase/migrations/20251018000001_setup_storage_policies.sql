-- Setup Storage Policies for file-uploads bucket

-- Policy: Authenticated users can upload to their own folder
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can upload to own folder'
  ) THEN
    CREATE POLICY "Users can upload to own folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'file-uploads'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- Policy: Authenticated users can read from their own folder
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can read own files'
  ) THEN
    CREATE POLICY "Users can read own files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'file-uploads'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- Policy: Service role can do anything (for Edge Functions)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Service role has full access'
  ) THEN
    CREATE POLICY "Service role has full access"
    ON storage.objects
    TO service_role
    USING (bucket_id = 'file-uploads')
    WITH CHECK (bucket_id = 'file-uploads');
  END IF;
END $$;
