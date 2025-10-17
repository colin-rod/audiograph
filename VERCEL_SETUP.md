# Vercel Deployment Setup

## Issue: DATABASE_URL not found in Vercel

If you're seeing this error in Vercel:
```
Error: DATABASE_URL environment variable is not set
```

Your Next.js API routes need access to the database to queue background jobs.

## Solution: Add Environment Variables to Vercel

### Step 1: Get Supabase Pooler URL

1. Go to: https://app.supabase.com/project/btgvrkfujiqwqbshcity/settings/database
2. Find "**Connection string**" section
3. Click the "**Connection pooling**" tab
4. Select "**Transaction**" mode
5. Copy the pooler URL (format: `postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres`)

### Step 2: Add Environment Variables to Vercel

1. Go to: https://vercel.com/your-username/audiograph/settings/environment-variables
2. Add the following variables:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `DATABASE_URL` | Your Supabase pooler URL | Use pooler (port 6543), not direct connection |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase API settings | ⚠️ Keep secret! Has elevated permissions |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://btgvrkfujiqwqbshcity.supabase.co` | Safe to expose (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase API settings | Safe to expose (works with RLS) |
| `LINEAR_API_KEY` | (Optional) For feedback widget | Only if you want feedback integration |
| `LINEAR_TEAM_ID` | (Optional) For feedback widget | Only if you want feedback integration |

### Step 3: Set Environment Scope

For each variable, select which environments it applies to:

- ✅ **Production** - Always enable
- ✅ **Preview** - Enable for testing
- ⚠️ **Development** - Optional (you have `.env.local` for this)

### Step 4: Redeploy

After adding variables:
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the three dots (...) menu
4. Click **Redeploy**
5. Check "Use existing Build Cache" (faster)
6. Click **Redeploy**

## Why Vercel Needs DATABASE_URL

Your Next.js application has two parts:

1. **Web App** (Vercel) - Handles uploads, queues jobs
2. **Worker** (Railway) - Processes jobs in background

Both need database access:
- **Vercel**: To create upload jobs and queue them with pg-boss
- **Railway**: To process those jobs and insert data

## Verify It Works

After redeploying, try uploading a ZIP file. Check Vercel logs:

✅ **Success**:
```
[API] Extracted 3 JSON files from my-spotify-data.zip
[API] Created upload job: abc-123-def
[Queue] Connection string found, attempting to connect...
[Queue] pg-boss started successfully
[API] Queued job for file 1/3: Streaming_History_Audio_2021-2025.json
```

❌ **Still failing**:
```
Error: DATABASE_URL environment variable is not set
```

If still failing:
1. Double-check the variable name is exactly `DATABASE_URL`
2. Ensure you redeployed after adding variables
3. Check the pooler URL format (port 6543, not 5432)

## Environment Variables Checklist

Use this checklist to ensure everything is set up:

### Vercel (Required)
- [ ] `DATABASE_URL` (Supabase pooler URL, port 6543)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Railway (Required)
- [ ] `DATABASE_URL` (Supabase pooler URL, port 6543)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Local Development (`.env.local`)
- [ ] `DATABASE_URL` (can use direct connection or pooler)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `LINEAR_API_KEY` (optional)
- [ ] `LINEAR_TEAM_ID` (optional)

## Security Notes

### Safe to Expose (Public)
- `NEXT_PUBLIC_SUPABASE_URL` - Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Works with Row Level Security

### Keep Secret (Server-only)
- `DATABASE_URL` - Full database access
- `SUPABASE_SERVICE_ROLE_KEY` - Bypasses RLS, has elevated permissions
- `LINEAR_API_KEY` - Can create issues in your workspace

**Never commit** these values to git! They're already in `.gitignore`.

## Common Issues

### Issue: "Queue does not exist" in Railway
**Solution**: Fixed by initializing the queue with a dummy job on worker startup. Just redeploy the worker.

### Issue: Jobs queued but never processed
**Possible causes**:
1. Railway worker not running - Check Railway dashboard
2. Different databases - Verify both Vercel and Railway use same `DATABASE_URL`
3. Connection string mismatch - Ensure both use pooler URL (port 6543)

### Issue: "ENETUNREACH" IPv6 error
**Solution**: Use Supabase pooler URL (port 6543) instead of direct connection (port 5432)
