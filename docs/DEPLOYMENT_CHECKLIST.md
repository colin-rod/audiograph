# Deployment Checklist

Use this checklist to ensure your AudioGraph deployment is fully configured and ready for production.

## Pre-Deployment Checklist

### 1. Supabase Setup

- [ ] **Create Supabase Project**
  - Go to [app.supabase.com](https://app.supabase.com)
  - Create new project
  - Note project URL and keys

- [ ] **Configure Environment Variables**
  - [ ] Copy `.env.example` to `.env.local`
  - [ ] Set `NEXT_PUBLIC_SUPABASE_URL` (from Supabase settings)
  - [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase settings)
  - [ ] (Optional) Set `LINEAR_API_KEY` for feedback integration
  - [ ] (Optional) Set `LINEAR_TEAM_ID` for feedback integration

### 2. Database Setup

- [ ] **Create `listens` Table**
  - Run the SQL from [SUPABASE_SETUP.md - Step 3](SUPABASE_SETUP.md#step-3-set-up-database-schema)
  - Verify table exists in Supabase Table Editor
  - Check indexes are created

- [ ] **Run Analytics Migration**
  - Option A: Use Supabase CLI (`supabase db push`)
  - Option B: Manually run `supabase/migrations/20250116_analytics_aggregation.sql`
  - Verify materialized views exist
  - Verify RPC functions exist

- [ ] **Configure Row Level Security**
  - Enable RLS on `listens` table
  - Create appropriate RLS policies for your use case
  - Test data access with authenticated/anonymous users

### 3. Storage Setup

- [ ] **Create `feedback-screenshots` Bucket**
  - Create bucket in Supabase Storage
  - Mark as **Public**
  - Note bucket name (must be `feedback-screenshots`)

- [ ] **Configure Storage Policies**
  - [ ] Create "Public read access" policy
  - [ ] Create "Authenticated uploads" policy
  - [ ] (Optional) Create "Anonymous uploads" policy

### 4. Authentication (Optional)

- [ ] **Enable Auth Providers**
  - Go to Authentication → Providers in Supabase
  - Enable desired OAuth providers (Google, GitHub, etc.)
  - Configure OAuth credentials
  - Set redirect URLs

- [ ] **Configure Email Templates**
  - Customize sign-up email template
  - Customize password reset template
  - Set sender email address

### 5. Local Development Testing

- [ ] **Start Development Server**
  ```bash
  npm install
  npm run dev
  ```

- [ ] **Test Core Features**
  - [ ] Homepage loads without errors
  - [ ] Can access `/upload` page
  - [ ] Can access `/dashboard` page
  - [ ] No console errors about missing env vars

- [ ] **Test Data Upload**
  - [ ] Upload a Spotify JSON file
  - [ ] Verify data appears in Supabase
  - [ ] Check dashboard shows analytics

- [ ] **Test Feedback Widget** (if enabled)
  - [ ] Click feedback button (bottom-right)
  - [ ] Upload a screenshot
  - [ ] Submit feedback
  - [ ] Verify screenshot in Storage bucket
  - [ ] (If Linear configured) Verify issue created

### 6. Production Deployment

- [ ] **Configure Hosting Provider**
  - Vercel, Netlify, or your preferred platform
  - Connect GitHub repository
  - Configure build settings

- [ ] **Set Production Environment Variables**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `LINEAR_API_KEY` (if using feedback)
  - [ ] `LINEAR_TEAM_ID` (if using feedback)

- [ ] **Configure GitHub Secrets** (for CI/CD)
  - Go to Repository Settings → Secrets and variables → Actions
  - [ ] Add `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] **Test Production Build Locally**
  ```bash
  npm run build
  npm start
  ```
  - Verify build completes without errors
  - Test all pages work correctly

- [ ] **Deploy to Production**
  - Push to main branch (or deploy manually)
  - Wait for deployment to complete
  - Visit production URL

### 7. Post-Deployment Verification

- [ ] **Test Production Site**
  - [ ] Homepage loads
  - [ ] Upload page works
  - [ ] Dashboard displays correctly
  - [ ] No console errors
  - [ ] Supabase connection working

- [ ] **Test with Real Data**
  - [ ] Upload Spotify listening history
  - [ ] Verify data in Supabase production database
  - [ ] Check analytics display correctly

- [ ] **Performance Check**
  - [ ] Page load times acceptable
  - [ ] Dashboard queries complete quickly
  - [ ] No timeout errors

- [ ] **Security Check**
  - [ ] Environment variables not exposed in browser
  - [ ] RLS policies working correctly
  - [ ] Storage policies preventing unauthorized access
  - [ ] HTTPS enabled

### 8. Monitoring & Maintenance

- [ ] **Set Up Monitoring**
  - Enable Supabase database logging
  - Monitor API usage in Supabase dashboard
  - Set up error tracking (Sentry, LogRocket, etc.)

- [ ] **Configure Backups**
  - Enable automated backups in Supabase
  - Set backup retention period
  - Test backup restoration process

- [ ] **Plan Maintenance Tasks**
  - Schedule materialized view refreshes
  - Plan for database vacuum/analyze
  - Monitor storage usage for cleanup needs

## Common Issues & Solutions

### Build Fails with "Supabase configuration error"

**Cause:** Environment variables not set in CI/CD

**Solution:**
- Add secrets to GitHub Actions (`.github/workflows/ci.yml`)
- Verify secret names match exactly
- Check that secrets are available in build step

### "Failed to fetch" errors in production

**Cause:** Incorrect Supabase URL or key

**Solution:**
- Double-check environment variables in hosting provider
- Verify keys are from correct Supabase project (not local)
- Check for trailing spaces or newlines in keys

### RLS Policy Blocks Data Access

**Cause:** Too restrictive RLS policies

**Solution:**
- Review policies in Supabase SQL Editor
- Test with both authenticated and anonymous users
- Temporarily disable RLS for debugging (re-enable after!)

### Storage Upload Fails

**Cause:** Missing storage bucket or policies

**Solution:**
- Verify bucket name is exactly `feedback-screenshots`
- Check all storage policies are created
- Test with a small image file first

## Rollback Plan

If deployment fails:

1. **Revert Application Code**
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Database Rollback** (if migration issues)
   - Restore from latest backup
   - Or manually drop problematic objects

3. **Notify Users**
   - Update status page (if applicable)
   - Inform team of rollback

## Support Resources

- **Application Issues**: Check application logs and console
- **Supabase Issues**: [status.supabase.com](https://status.supabase.com)
- **Build Issues**: Review GitHub Actions logs
- **Documentation**: See [docs/](.) for detailed guides

## Success Criteria

Your deployment is successful when:

- ✅ All pages load without errors
- ✅ Users can upload listening history
- ✅ Dashboard shows analytics correctly
- ✅ Data persists in Supabase
- ✅ No console errors or warnings
- ✅ Feedback widget works (if enabled)
- ✅ Performance is acceptable
- ✅ HTTPS is enabled and working

---

**Last Updated:** 2025-01-16

**Maintainers:** Add your team contacts here for deployment questions
