# Storage Buckets Configuration

This document describes the Supabase storage bucket configuration for AudioGraph.

## Overview

AudioGraph uses Supabase Storage to store user-uploaded feedback screenshots. The storage is configured with Row Level Security (RLS) policies to control access.

## Buckets

### `feedback-screenshots`

Stores screenshots uploaded by users when submitting feedback via the feedback widget.

#### Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| **Bucket Name** | `feedback-screenshots` | Identifier for the bucket |
| **Visibility** | Public | Files are publicly readable via URL |
| **File Size Limit** | 5 MB | Enforced at application level |
| **Max Files per Upload** | 5 | Enforced at application level |
| **Allowed MIME Types** | `image/png`, `image/jpeg`, `image/jpg`, `image/webp` | Enforced at application level |

#### Setup Instructions

##### 1. Create the Bucket

In your Supabase dashboard:

1. Navigate to **Storage** in the sidebar
2. Click **"New bucket"**
3. Enter the following details:
   - **Name**: `feedback-screenshots`
   - **Public bucket**: ☑️ **Enabled**
4. Click **"Create bucket"**

##### 2. Configure Storage Policies

After creating the bucket, you need to set up Row Level Security policies.

Go to **Storage** → **Policies** and create the following policies:

###### Policy 1: Public Read Access

Allow anyone to view uploaded screenshots (for sharing feedback with team).

```sql
CREATE POLICY "Public read access for feedback screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'feedback-screenshots');
```

**Details:**
- **Policy Name**: Public read access for feedback screenshots
- **Allowed Operation**: SELECT
- **Target Roles**: All (public, anon, authenticated)
- **USING Expression**: `bucket_id = 'feedback-screenshots'`

###### Policy 2: Authenticated User Uploads

Allow authenticated users to upload screenshots.

```sql
CREATE POLICY "Allow authenticated uploads to feedback screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-screenshots');
```

**Details:**
- **Policy Name**: Allow authenticated uploads to feedback screenshots
- **Allowed Operation**: INSERT
- **Target Roles**: authenticated
- **WITH CHECK Expression**: `bucket_id = 'feedback-screenshots'`

###### Policy 3: Anonymous Uploads (Optional)

Allow anonymous users to upload screenshots (useful for public feedback).

```sql
CREATE POLICY "Allow anonymous uploads to feedback screenshots"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'feedback-screenshots');
```

**Details:**
- **Policy Name**: Allow anonymous uploads to feedback screenshots
- **Allowed Operation**: INSERT
- **Target Roles**: anon
- **WITH CHECK Expression**: `bucket_id = 'feedback-screenshots'`

> **Note:** Only enable anonymous uploads if you want to allow unauthenticated users to submit feedback.

##### 3. Verify Setup

Test the storage bucket by:

1. Running the application locally
2. Clicking the feedback button (bottom-right corner)
3. Pasting or uploading a screenshot
4. Submitting feedback
5. Checking the Supabase Storage dashboard to see the uploaded file

## File Naming Convention

Files are uploaded with the following naming pattern:

```
feedback-{timestamp}-{randomString}-{index}.{extension}
```

**Example:** `feedback-1705334400000-abc123def456-0.png`

This ensures:
- Unique filenames (no collisions)
- Chronological ordering
- Easy identification of feedback screenshots

## Application Implementation

### Upload Endpoint

Files are uploaded via the API route:
```
POST /api/feedback/upload-screenshots
```

**Located at:** [src/app/api/feedback/upload-screenshots/route.ts](../src/app/api/feedback/upload-screenshots/route.ts)

### Upload Process

1. **Client-side validation**: Check file size and type
2. **Send to API**: Upload files via multipart form data
3. **Server-side validation**: Re-validate file constraints
4. **Upload to Supabase**: Store in `feedback-screenshots` bucket
5. **Return URLs**: Return public URLs to client
6. **Submit feedback**: Send URLs to Linear API with feedback text

### Example Usage

```typescript
// Client-side upload
const formData = new FormData()
screenshots.forEach((file, index) => {
  formData.append(`screenshot_${index}`, file)
})

const response = await fetch('/api/feedback/upload-screenshots', {
  method: 'POST',
  body: formData,
})

const { success, urls } = await response.json()
```

## Security Considerations

### Public Bucket

The bucket is marked as **public** because:
- Screenshots are used in Linear issues shared with the team
- No sensitive user data is captured in screenshots
- Feedback is intended to be shared, not private

### File Size Limits

5 MB limit prevents:
- Storage abuse
- Excessive bandwidth usage
- Performance issues

### File Type Restrictions

Only image types are allowed to:
- Prevent executable file uploads
- Ensure predictable rendering in Linear
- Protect against malicious files

### RLS Policies

Row Level Security policies:
- Control who can upload files
- Prevent unauthorized modifications
- Enable public read access for sharing

## Monitoring & Maintenance

### View Storage Usage

In Supabase dashboard:
1. Go to **Storage**
2. Click on `feedback-screenshots` bucket
3. View **Storage usage** metrics

### Clean Up Old Files (Optional)

To prevent unbounded storage growth, you can periodically delete old feedback screenshots:

```sql
-- Delete screenshots older than 90 days
DELETE FROM storage.objects
WHERE bucket_id = 'feedback-screenshots'
  AND created_at < NOW() - INTERVAL '90 days';
```

Consider setting up a scheduled job (cron) to run this cleanup automatically.

### Cost Optimization

Supabase Storage pricing (Free tier):
- **Storage**: 1 GB free
- **Bandwidth**: 2 GB free per month

To stay within free tier:
- Delete old screenshots periodically
- Compress images before upload (handled in application)
- Monitor usage in Supabase dashboard

## Troubleshooting

### "Failed to upload screenshot"

**Possible causes:**
1. Bucket doesn't exist
2. Incorrect bucket name in code
3. Missing RLS policies
4. File size exceeds limit
5. File type not allowed

**Solutions:**
1. Verify bucket exists in Supabase dashboard
2. Check bucket name matches `feedback-screenshots` exactly
3. Create all required RLS policies (see above)
4. Ensure file is under 5 MB
5. Check file is PNG, JPEG, or WebP format

### "Access denied" errors

**Cause:** Missing or incorrect RLS policies

**Solution:**
1. Go to **Storage** → **Policies** in Supabase
2. Verify all three policies are created (see setup instructions)
3. Check policy conditions match exactly

### Files not visible in bucket

**Cause:** Files may be uploaded but not showing in dashboard immediately

**Solution:**
1. Refresh the Supabase dashboard
2. Check the API response for uploaded file URLs
3. Try accessing the file directly via its public URL

### Upload times out

**Cause:** File too large or network issues

**Solution:**
1. Reduce image file size before upload
2. Check internet connection
3. Try a smaller file to test
4. Check Supabase service status

## Additional Storage Buckets (Future)

If you need additional storage buckets in the future:

### User Profile Pictures
```sql
-- Create bucket: user-avatars
-- Public: true
-- Policy: Users can only upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Private User Data
```sql
-- Create bucket: user-data
-- Public: false
-- Policy: Users can only access their own data
CREATE POLICY "Users can access their own data"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'user-data' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-data' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage RLS Policies Guide](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage Pricing](https://supabase.com/pricing)
- [Image Upload Best Practices](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
