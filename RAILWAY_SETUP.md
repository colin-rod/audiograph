# Railway Deployment Setup for Audiograph Worker

## Common Issues

### Issue 1: DATABASE_URL not found in Railway

If you're seeing this error:
```
[Worker] Failed to start worker: Error: DATABASE_URL environment variable is not set
```

This means the worker service in Railway cannot access the `DATABASE_URL` environment variable.

### Issue 2: IPv6 Connection Error (ENETUNREACH)

If you're seeing this error:
```
[Queue] Failed to start pg-boss: Error: connect ENETUNREACH 2a05:d018:...
```

This means Railway is trying to connect using IPv6, but the network doesn't support it. **This is a known Railway + Supabase issue.**

## Solutions

### Fix for IPv6 Connection Error (CRITICAL)

**The issue**: Supabase's database hostname resolves to both IPv4 and IPv6 addresses. Railway's Node.js environment may try IPv6 first, which doesn't work in Railway's network.

**Solution**: Use Supabase's IPv4-only connection pooler or direct connection:

1. **Option A - Use Connection Pooler (Recommended)**:
   - Go to Supabase Dashboard → Settings → Database
   - Find "Connection string" section
   - Use the **Connection Pooling** string (not the direct connection)
   - It should look like: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`
   - This uses port `6543` (pooler) instead of `5432` (direct)
   - The pooler is more reliable for serverless/Railway deployments

2. **Option B - Use IPv4 Address Directly**:
   - Get your Supabase database's IPv4 address
   - Replace the hostname with the IP address
   - Format: `postgresql://postgres:[PASSWORD]@<IPv4-ADDRESS>:5432/postgres`
   - Note: This is less maintainable if Supabase changes IPs

3. **Option C - Use Railway's PostgreSQL** (if you prefer):
   - Add a PostgreSQL database to your Railway project
   - Link it to your service
   - Run migrations to set up the database
   - Railway will automatically provide `DATABASE_URL`

**After applying the fix**, set the connection string in Railway (see below).

---

### Option 1: Add DATABASE_URL to Railway Service (Recommended)

1. Go to your Railway project dashboard
2. Click on your worker service
3. Go to the **Variables** tab
4. Add the `DATABASE_URL` variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Your Supabase PostgreSQL connection string (**USE POOLER - see IPv6 fix above**)
   - Get it from: https://app.supabase.com/project/_/settings/database
   - **Recommended Format** (Connection Pooler): `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`
   - ⚠️ **Important**: Use port `6543` (pooler) not `5432` (direct) to avoid IPv6 issues

5. Also ensure these variables are set:
   - `SUPABASE_SERVICE_ROLE_KEY` (from Supabase API settings)
   - `NEXT_PUBLIC_SUPABASE_URL` (your Supabase project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase API settings)

6. Redeploy the service

### Option 2: Use Shared Variables

If you have multiple services in Railway:

1. Go to **Project Settings** → **Shared Variables**
2. Add `DATABASE_URL` there
3. Make sure the variable is **shared** with your worker service
4. Redeploy

### Option 3: Connect Railway PostgreSQL Database

If you're using Railway's PostgreSQL database addon:

1. Railway should automatically set `DATABASE_URL`
2. If not, check that the database is linked to your service
3. Go to your service → **Settings** → **Service Variables**
4. Ensure the database connection variables are visible

## Verification

After setting the variable, the logs should show:

```
[Queue] Checking for DATABASE_URL...
[Queue] Available env vars: [ 'DATABASE_URL' ]
[Queue] Connection string found, attempting to connect...
[Queue] pg-boss started successfully
[Worker] Upload processor worker started successfully
```

## Troubleshooting

If the variable still isn't found:

1. **Check the service name**: Ensure you're adding variables to the correct service (the worker, not the web app)

2. **Check Railway logs**: The improved error message will now show all available environment variables

3. **Restart the service**: Sometimes Railway needs a full restart after adding variables

4. **Check for typos**: The variable name must be exactly `DATABASE_URL` (all caps)

5. **Test locally**: Run `npm run worker:dev` locally to ensure the worker code works

## Railway Configuration Files

The worker is configured in `railway.json`:

```json
{
  "deploy": {
    "startCommand": "npm run worker"
  }
}
```

## Required Environment Variables for Worker

```bash
# Database Connection (REQUIRED) - USE POOLER URL
# Get from: Supabase Dashboard → Settings → Database → Connection Pooling
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres

# Supabase Configuration (REQUIRED)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Linear Integration (OPTIONAL)
LINEAR_API_KEY=your_linear_api_key
LINEAR_TEAM_ID=your_team_id
```

## How to Get Supabase Connection Pooler URL

1. Go to https://app.supabase.com/project/YOUR_PROJECT_ID/settings/database
2. Scroll to "Connection string" section
3. **Select "Connection pooling" tab** (not "URI" or "Connection string")
4. Choose "Transaction" mode
5. Copy the connection string that looks like:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
6. Notice:
   - Uses `pooler.supabase.com` hostname (not `db.xxx.supabase.co`)
   - Uses port `6543` (not `5432`)
   - This is IPv4-only and works in Railway

## Why Use Connection Pooler?

1. **IPv4 Only**: The pooler uses IPv4, avoiding Railway's IPv6 issues
2. **Better for Serverless**: Connection pooling is optimized for short-lived connections
3. **More Reliable**: Handles connection limits better
4. **Transaction Mode**: Supports transactions needed by pg-boss
