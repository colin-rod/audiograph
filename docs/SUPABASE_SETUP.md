# Supabase Setup Guide

This guide will help you set up a Supabase project for AudioGraph from scratch.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Step 1: Create a Supabase Project](#step-1-create-a-supabase-project)
- [Step 2: Configure Environment Variables](#step-2-configure-environment-variables)
- [Step 3: Set Up Database Schema](#step-3-set-up-database-schema)
- [Step 4: Configure Storage Buckets](#step-4-configure-storage-buckets)
- [Step 5: Run Database Migrations](#step-5-run-database-migrations)
- [Step 6: Verify Setup](#step-6-verify-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- A Supabase account ([sign up here](https://supabase.com))
- Node.js 18+ installed
- Git repository cloned locally

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in the project details:
   - **Name**: `audiograph` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select the closest region to your users
4. Click **"Create new project"**
5. Wait for the project to finish provisioning (~2 minutes)

## Step 2: Configure Environment Variables

### Get Your API Credentials

1. In your Supabase project dashboard, click **Settings** (gear icon)
2. Navigate to **API** in the left sidebar
3. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

### Set Up Local Environment

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and update with your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
   ```

> **Note:** The anon key is safe to expose in the browser as it works with Row Level Security (RLS) policies.

## Step 3: Set Up Database Schema

### Create the `listens` Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Paste the following SQL and click **Run**:

```sql
-- Create the listens table for storing Spotify listening history
CREATE TABLE IF NOT EXISTS listens (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL,
  artist text,
  track text,
  ms_played integer,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX idx_listens_ts ON listens(ts) WHERE ts IS NOT NULL;
CREATE INDEX idx_listens_artist ON listens(artist) WHERE artist IS NOT NULL;
CREATE INDEX idx_listens_track ON listens(track) WHERE track IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE listens ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all authenticated users to read/write
-- Adjust these policies based on your security requirements
CREATE POLICY "Allow authenticated access to listens"
  ON listens
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Optional: Allow anonymous read access for public dashboards
-- CREATE POLICY "Allow public read access to listens"
--   ON listens
--   FOR SELECT
--   TO anon
--   USING (true);
```

### Table Schema Details

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | bigserial | Yes | Auto-incrementing primary key |
| `ts` | timestamptz | Yes | Timestamp when the song was played |
| `artist` | text | No | Artist name |
| `track` | text | No | Track name |
| `ms_played` | integer | No | Milliseconds played |
| `created_at` | timestamptz | Yes | Record creation timestamp (auto) |

## Step 4: Configure Storage Buckets

### Create the `feedback-screenshots` Bucket

This bucket stores screenshots uploaded with user feedback.

1. In your Supabase dashboard, go to **Storage**
2. Click **"New bucket"**
3. Configure the bucket:
   - **Name**: `feedback-screenshots`
   - **Public bucket**: ☑️ **Enabled** (makes files publicly accessible)
4. Click **"Create bucket"**

### Configure Storage Policies

1. Click on the `feedback-screenshots` bucket
2. Go to **Policies** tab
3. Click **"New policy"** and add the following policies:

#### Policy 1: Public Read Access
```sql
CREATE POLICY "Public read access for feedback screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'feedback-screenshots');
```

#### Policy 2: Allow Authenticated Uploads
```sql
CREATE POLICY "Allow authenticated uploads to feedback screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-screenshots');
```

#### Policy 3: Allow Anonymous Uploads (Optional)
```sql
CREATE POLICY "Allow anonymous uploads to feedback screenshots"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'feedback-screenshots');
```

### Storage Configuration Summary

- **Bucket Name:** `feedback-screenshots`
- **Visibility:** Public (read-only)
- **Max File Size:** 5 MB (enforced in application)
- **Allowed File Types:** PNG, JPEG, JPG, WebP (enforced in application)
- **Max Files per Upload:** 5 (enforced in application)

## Step 5: Run Database Migrations

The project includes advanced analytics features via database migrations.

### Option A: Using Supabase CLI (Recommended)

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your_project_id
   ```

   > Find your project ID in the Supabase dashboard URL or Settings > General

3. Run migrations:
   ```bash
   supabase db push
   ```

### Option B: Manual Migration

1. Go to **SQL Editor** in your Supabase dashboard
2. Open the migration file: `supabase/migrations/20250116_analytics_aggregation.sql`
3. Copy the entire contents
4. Paste into a new SQL query in Supabase
5. Click **Run**

This migration adds:
- Materialized views for pre-aggregated analytics
- RPC functions for efficient querying
- Indexes for performance optimization
- Full-text search support

## Step 6: Verify Setup

### Test Database Connection

Run the development server:
```bash
npm run dev
```

Then visit:
- **Homepage:** http://localhost:3000
- **Upload Page:** http://localhost:3000/upload
- **Dashboard:** http://localhost:3000/dashboard

### Test the Setup

1. **Upload Test Data:**
   - Go to `/upload`
   - Upload a Spotify data export JSON file
   - Verify data appears in Supabase (Table Editor > listens)

2. **View Dashboard:**
   - Go to `/dashboard`
   - Should see analytics charts and statistics

3. **Test Feedback (Optional):**
   - Click the feedback button (bottom right)
   - Upload a screenshot
   - Check the `feedback-screenshots` bucket in Supabase Storage

## Troubleshooting

### Environment Variable Issues

**Error:** "NEXT_PUBLIC_SUPABASE_URL is not defined"

**Solution:**
- Verify `.env.local` exists in the project root
- Check that variable names are correct (case-sensitive)
- Restart the development server after changing `.env.local`
- Ensure no typos in the variable names

### Database Connection Issues

**Error:** "Failed to fetch" or timeout errors

**Solution:**
- Verify your Supabase project is active (not paused)
- Check that the URL and anon key are correct
- Ensure your internet connection is stable
- Check Supabase status page: https://status.supabase.com

### RLS Policy Issues

**Error:** "new row violates row-level security policy"

**Solution:**
- Verify RLS policies are created correctly
- Check if user authentication is required for your policies
- For development, you can temporarily disable RLS:
  ```sql
  ALTER TABLE listens DISABLE ROW LEVEL SECURITY;
  ```
  > **Warning:** Only for local development! Re-enable for production.

### Storage Upload Issues

**Error:** "Failed to upload screenshot"

**Solution:**
- Verify the `feedback-screenshots` bucket exists
- Check storage policies are configured correctly
- Ensure file size is under 5 MB
- Verify file type is supported (PNG, JPEG, WebP)

### Migration Issues

**Error:** Migration fails to run

**Solution:**
- Check if tables already exist (migration is idempotent)
- Verify you have necessary permissions
- Run migrations one section at a time if needed
- Check PostgreSQL version (should be 14+)

## Next Steps

- **Authentication:** Set up OAuth providers (Google, Spotify) and password authentication - see [OAUTH_SETUP.md](./OAUTH_SETUP.md)
- **Security:** Review and adjust RLS policies for your use case
- **Monitoring:** Enable database logging in Supabase dashboard
- **Backups:** Configure automatic backups (Settings > Database)
- **Production:** Update environment variables in your hosting provider

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)

## Support

If you encounter issues not covered here:
1. Check the [Supabase Community](https://github.com/supabase/supabase/discussions)
2. Open an issue in the project repository
3. Review application logs for detailed error messages
