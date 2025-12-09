# 🚀 Deployment Quick Start Guide

## Overview

Audiograph uses a **two-service architecture**:

1. **Vercel** - Next.js web app (handles uploads, queues jobs)
2. **Railway** - Background worker (processes uploads)

Both services need access to the same Supabase PostgreSQL database.

## Quick Setup (5 minutes)

### 1️⃣ Get Supabase Connection Pooler URL

This is the **most important step** - the pooler URL works in both Vercel and Railway.

1. Go to: https://app.supabase.com/project/btgvrkfujiqwqbshcity/settings/database
2. Click "**Connection pooling**" tab
3. Select "**Transaction**" mode
4. Copy the URL - it should look like:
   ```
   postgresql://postgres.btgvrkfujiqwqbshcity:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```
5. **Key features**:
   - Uses `pooler.supabase.com` (not `db.xxx.supabase.co`)
   - Uses port `6543` (not `5432`)
   - IPv4-only (avoids Railway network issues)

### 2️⃣ Set Up Vercel

1. Go to: https://vercel.com/your-username/audiograph/settings/environment-variables
2. Add these variables (for Production + Preview):

```bash
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_URL=https://btgvrkfujiqwqbshcity.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. **Redeploy** the application

### 3️⃣ Set Up Railway

1. Go to Railway → Your Project → Worker Service → Variables
2. Add the **same variables** as Vercel:

```bash
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_URL=https://btgvrkfujiqwqbshcity.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. **Redeploy** the worker service

## Verify Everything Works

### ✅ Vercel Logs (should show):
```
[API] Extracting ZIP file: my-spotify-data.zip
[API] Extracted 3 JSON files
[API] Created upload job: abc-123
[Queue] pg-boss started successfully
[API] Queued job for file 1/3
```

### ✅ Railway Logs (should show):
```
[Worker] Starting upload processor worker...
[Queue] pg-boss started successfully
[Worker] Ensuring queue exists...
[Worker] Queue initialized successfully
[Worker] Upload processor worker started successfully
[Worker] Listening for jobs on queue: process-json-file
```

### ✅ Upload Flow:
1. User uploads ZIP file on Vercel
2. Vercel extracts JSON files and queues jobs
3. Railway worker picks up jobs
4. Railway worker processes files and inserts into database
5. User sees progress in dashboard

## Common Issues & Fixes

| Error | Where | Fix |
|-------|-------|-----|
| `DATABASE_URL not set` | Vercel | Add `DATABASE_URL` to Vercel env vars |
| `DATABASE_URL not set` | Railway | Add `DATABASE_URL` to Railway env vars |
| `ENETUNREACH IPv6` | Railway | Use pooler URL (port 6543) not direct |
| `Queue does not exist` | Railway | Fixed automatically by worker init |
| Jobs queued but not processed | Both | Ensure both use same pooler URL |

## Where to Get Credentials

| Credential | Location |
|-----------|----------|
| `DATABASE_URL` | Supabase → Settings → Database → Connection pooling |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → Service role key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → Project API keys → anon public |

## Detailed Guides

- **Vercel Setup**: See [VERCEL_SETUP.md](VERCEL_SETUP.md)
- **Railway Setup**: See [RAILWAY_SETUP.md](RAILWAY_SETUP.md)
- **IPv6 Fix**: See [RAILWAY_IPv6_FIX.md](RAILWAY_IPv6_FIX.md)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User uploads ZIP                      │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Vercel (Next.js App)                                    │
│  - Receives upload                                       │
│  - Extracts JSON files                                   │
│  - Queues jobs in pg-boss    ◄──────────┐               │
└───────────────────────┬─────────────────┼───────────────┘
                        │                 │
                        │                 │
                        ▼                 │
┌─────────────────────────────────────────┼───────────────┐
│  Supabase PostgreSQL Database           │               │
│  - Stores user data                     │               │
│  - pg-boss job queue  ◄─────────────────┤               │
│  - Analytics views                      │               │
└───────────────────────┬─────────────────┼───────────────┘
                        │                 │
                        │                 │
                        ▼                 │
┌─────────────────────────────────────────┼───────────────┐
│  Railway (Worker)                       │               │
│  - Picks up jobs from queue ────────────┘               │
│  - Processes JSON files                                 │
│  - Inserts listens into database                        │
│  - Updates job status                                   │
└─────────────────────────────────────────────────────────┘
```

## Security Checklist

- [ ] Never commit `.env.local` to git
- [ ] Keep `SUPABASE_SERVICE_ROLE_KEY` secret (server-only)
- [ ] `DATABASE_URL` is secret (server-only)
- [ ] `NEXT_PUBLIC_*` variables are safe to expose
- [ ] Use pooler URL for production (more secure + reliable)

## Support

If you're still having issues:
1. Check Vercel deployment logs
2. Check Railway deployment logs
3. Verify all environment variables are set correctly
4. Ensure both services use the same database pooler URL
5. Try the detailed guides above
