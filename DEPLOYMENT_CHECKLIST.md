# ZIP Upload Feature - Deployment Checklist

## ✅ Pre-Deployment Verification

- [x] All tests passing (26/26 tests)
- [x] TypeScript compilation successful
- [x] No linting errors
- [x] Documentation complete

## 📋 Deployment Steps

### 1. Database Migration

Apply the upload_jobs migration to your Supabase database:

```bash
# Option A: Using Supabase CLI
supabase db push

# Option B: Using psql directly
psql $DATABASE_URL -f supabase/migrations/20251017120417_upload_jobs.sql
```

**Verification:**
```sql
-- Check table exists
SELECT * FROM upload_jobs LIMIT 1;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'upload_jobs';
```

### 2. Environment Variables

Set these in your production environment:

#### **Next.js App (Vercel/Platform)**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

#### **Background Worker (Separate Service)**
```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
```

**Get these from:**
- Supabase Dashboard → Settings → API
- Supabase Dashboard → Settings → Database

### 3. Deploy Next.js Application

```bash
# Build and test locally first
npm run build
npm run start

# Deploy to your platform (e.g., Vercel)
git add .
git commit -m "feat: add ZIP upload with background processing"
git push origin main
```

### 4. Deploy Background Worker

Choose one deployment option:

#### **Option A: Heroku**
```bash
# Create new app
heroku create audiograph-worker

# Set environment variables
heroku config:set DATABASE_URL=postgresql://...
heroku config:set SUPABASE_SERVICE_ROLE_KEY=...
heroku config:set NEXT_PUBLIC_SUPABASE_URL=...

# Create Procfile
echo "worker: npm run worker" > Procfile

# Deploy
git push heroku main

# Scale worker
heroku ps:scale worker=1
```

#### **Option B: Railway**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create new project
railway init

# Set environment variables via Railway dashboard

# Deploy
railway up
```

#### **Option C: Render**
1. Create new "Background Worker" service
2. Connect GitHub repo
3. Set build command: `npm install`
4. Set start command: `npm run worker`
5. Add environment variables
6. Deploy

### 5. Verify Deployment

#### Test Next.js App
1. Navigate to `/upload`
2. Upload a small JSON file (should work as before)
3. Check redirect to dashboard

#### Test ZIP Upload
1. Upload a ZIP file (or use test ZIP)
2. Verify status polling shows progress
3. Check worker logs for processing
4. Verify completion and redirect

#### Test Worker
```bash
# Check worker logs (platform-specific)
heroku logs --tail -a audiograph-worker  # Heroku
railway logs                              # Railway
# Or check platform dashboard

# Expected output:
[Worker] Starting upload processor worker...
[Queue] pg-boss started successfully
[Worker] Listening for jobs on queue: process-json-file
```

#### Test Database
```sql
-- Check upload jobs are created
SELECT * FROM upload_jobs ORDER BY created_at DESC LIMIT 5;

-- Check records are inserted
SELECT COUNT(*) FROM listens
WHERE created_at > NOW() - INTERVAL '1 hour';
```

## 🔍 Monitoring

### Key Metrics to Monitor

1. **Upload Success Rate**
   ```sql
   SELECT
     status,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM upload_jobs
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY status;
   ```

2. **Processing Time**
   ```sql
   SELECT
     AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds,
     MAX(EXTRACT(EPOCH FROM (updated_at - created_at))) as max_seconds
   FROM upload_jobs
   WHERE status = 'completed'
   AND created_at > NOW() - INTERVAL '24 hours';
   ```

3. **Error Rate**
   ```sql
   SELECT
     error_message,
     COUNT(*) as occurrences
   FROM upload_jobs
   WHERE status = 'failed'
   AND created_at > NOW() - INTERVAL '24 hours'
   GROUP BY error_message
   ORDER BY occurrences DESC;
   ```

### Worker Health Checks

**Heroku:**
```bash
heroku ps -a audiograph-worker
heroku logs --tail -a audiograph-worker
```

**Railway:**
```bash
railway logs
railway status
```

**Render:**
- Check service dashboard
- View logs in UI
- Set up health check endpoint (future enhancement)

## 🚨 Rollback Plan

If issues arise:

1. **Stop Worker**
   ```bash
   heroku ps:scale worker=0 -a audiograph-worker  # Heroku
   railway down                                     # Railway
   # Or stop via platform UI
   ```

2. **Revert Frontend**
   ```bash
   git revert HEAD
   git push origin main
   # Or rollback via platform UI
   ```

3. **Database Rollback** (if needed)
   ```sql
   -- Drop upload_jobs table
   DROP TABLE IF EXISTS upload_jobs CASCADE;
   DROP TYPE IF EXISTS upload_job_status;
   ```

## 📊 Success Criteria

- [ ] Migration applied successfully
- [ ] Environment variables configured
- [ ] Next.js app deployed and accessible
- [ ] Background worker running and processing jobs
- [ ] Test ZIP upload completes successfully
- [ ] No errors in logs
- [ ] Dashboard shows uploaded data
- [ ] Analytics views refreshed

## 🔧 Troubleshooting

### Worker Not Processing Jobs

**Check:**
1. Worker is running: `heroku ps` / `railway status`
2. DATABASE_URL is correct
3. SUPABASE_SERVICE_ROLE_KEY is set
4. Firewall allows PostgreSQL connection (port 5432)

**Fix:**
```bash
# Restart worker
heroku restart -a audiograph-worker
railway restart
```

### Jobs Stuck in 'processing'

**Check:**
```sql
SELECT * FROM upload_jobs
WHERE status = 'processing'
AND updated_at < NOW() - INTERVAL '10 minutes';
```

**Fix:**
```sql
-- Mark as failed for manual review
UPDATE upload_jobs
SET status = 'failed',
    error_message = 'Processing timeout - investigate manually'
WHERE status = 'processing'
AND updated_at < NOW() - INTERVAL '10 minutes';
```

### High Error Rate

**Check logs:**
```bash
heroku logs --tail -a audiograph-worker | grep ERROR
```

**Common issues:**
- Invalid JSON in ZIP files
- Database connection issues
- Memory limits (increase dyno size)
- Rate limiting from Supabase

## 📈 Performance Tuning

### If Processing is Slow

1. **Increase Worker Instances**
   ```bash
   heroku ps:scale worker=2  # Scale to 2 workers
   ```

2. **Optimize Batch Size**
   - Edit `src/lib/queue/processor.ts`
   - Adjust `BATCH_SIZE` (currently 500)

3. **Database Optimization**
   - Ensure indexes are present
   - Consider connection pooling
   - Monitor Supabase dashboard

### If Database is Slow

```sql
-- Check slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Add missing indexes if needed
CREATE INDEX CONCURRENTLY idx_listens_user_ts
ON listens(user_id, ts DESC);
```

## 🎯 Post-Deployment Tasks

- [ ] Monitor error rates for 24 hours
- [ ] Check worker logs for issues
- [ ] Verify analytics refresh is working
- [ ] Test with various ZIP file sizes
- [ ] Gather user feedback
- [ ] Update documentation with learnings

## 📞 Support Contacts

- **Database Issues**: Check Supabase status page
- **Worker Issues**: Check platform status (Heroku/Railway/Render)
- **Code Issues**: Review GitHub issues / logs

---

**Deployment completed! 🚀**
