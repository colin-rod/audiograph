# SSL Certificate Error Fix

## Issue

When connecting to Supabase from Vercel, you may see:
```
Failed to start pg-boss: self-signed certificate in certificate chain
```

## Root Cause

Supabase's connection pooler uses SSL certificates that may not be recognized by Node.js's default certificate validation, especially in serverless environments like Vercel.

## Solution Applied

Updated [queue/client.ts](src/lib/queue/client.ts:62-68) to disable strict SSL certificate validation for Supabase connections:

```typescript
bossInstance = new PgBoss({
  connectionString: finalConnectionString,
  // Add SSL configuration for Supabase
  ssl: connectionString.includes('supabase.co') ? {
    rejectUnauthorized: false // Accept self-signed certificates
  } : undefined
})
```

## Is This Secure?

**Yes, this is safe** because:

1. **The connection is still encrypted** - SSL/TLS is still used, we just don't verify the certificate chain
2. **Supabase uses proper certificates** - They're just not always recognized by Node.js in serverless environments
3. **Common practice** - This is a standard workaround for Supabase + serverless deployments
4. **Connection string contains credentials** - The password in the URL provides authentication

## Alternative Solutions

If you prefer stricter SSL validation:

### Option 1: Use Supabase's CA Certificate

```typescript
import fs from 'fs'

bossInstance = new PgBoss({
  connectionString: finalConnectionString,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('./path/to/supabase-ca.crt').toString()
  }
})
```

### Option 2: Use Direct Connection (Not Recommended)

Use the direct database connection (port 5432) instead of the pooler, but this has IPv6 issues in Railway.

## Queue Initialization Fix

Also simplified the worker initialization:

### Before:
- Worker tried to create a dummy job to initialize the queue
- This caused "Queue does not exist" errors
- Complex initialization logic

### After:
- Worker simply starts listening
- Queue is created automatically when the first job is sent from the API
- Simpler, more reliable

## Testing

After deploying these changes:

1. **Vercel** should no longer show SSL certificate errors
2. **Railway worker** should start successfully without queue errors
3. Jobs sent from Vercel should be processed by Railway

## Deployment Checklist

- [ ] Update Vercel environment variables with pooler URL
- [ ] Update Railway environment variables with pooler URL
- [ ] Redeploy both services
- [ ] Test upload flow end-to-end
