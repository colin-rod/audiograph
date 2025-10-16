# AudioGraph Documentation

Welcome to the AudioGraph documentation! This directory contains comprehensive guides for setting up, deploying, and maintaining your AudioGraph application.

## Quick Links

### Getting Started
- **[Supabase Setup Guide](SUPABASE_SETUP.md)** - Start here if you're setting up AudioGraph for the first time
- **[Deployment Checklist](DEPLOYMENT_CHECKLIST.md)** - Use this checklist to ensure complete setup

### Reference Documentation
- **[Database Schema](DATABASE_SCHEMA.md)** - Complete database structure and RPC functions
- **[Storage Buckets](STORAGE_BUCKETS.md)** - Storage configuration and policies

## Documentation Overview

### 📚 [Supabase Setup Guide](SUPABASE_SETUP.md)

**Start here for new deployments!**

A step-by-step guide to setting up Supabase from scratch:
- Creating a Supabase project
- Configuring environment variables
- Setting up database tables
- Configuring storage buckets
- Running migrations
- Troubleshooting common issues

**Time to complete:** ~20 minutes

---

### ✅ [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)

**Use this to verify your setup is complete!**

A comprehensive checklist covering:
- Pre-deployment tasks
- Environment configuration
- Database and storage setup
- Testing procedures
- Production deployment steps
- Post-deployment verification

**Perfect for:** Team deployments, QA verification, production readiness

---

### 🗄️ [Database Schema](DATABASE_SCHEMA.md)

**Reference guide for database structure**

Detailed documentation of:
- Table schemas and columns
- Materialized views for analytics
- RPC functions for querying
- Indexes and performance
- Row Level Security policies
- Best practices

**Use this when:**
- Writing custom queries
- Understanding data structure
- Optimizing performance
- Implementing new features

---

### 📦 [Storage Buckets](STORAGE_BUCKETS.md)

**Reference guide for file storage**

Complete documentation of:
- Bucket configuration
- Storage policies (RLS)
- Upload implementation
- Security considerations
- Monitoring and cleanup

**Use this when:**
- Configuring storage
- Troubleshooting uploads
- Adding new buckets
- Managing storage costs

---

## Common Scenarios

### "I'm setting up AudioGraph for the first time"

1. Follow the [Supabase Setup Guide](SUPABASE_SETUP.md)
2. Use the [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) to verify everything works
3. Reference other docs as needed for troubleshooting

### "I need to deploy to production"

1. Review the [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)
2. Verify all environment variables are configured
3. Test locally before deploying
4. Follow post-deployment verification steps

### "I need to understand the database structure"

1. Read the [Database Schema](DATABASE_SCHEMA.md)
2. Check the migration files in `supabase/migrations/`
3. Review RPC functions for querying patterns

### "Upload/storage isn't working"

1. Check the [Storage Buckets](STORAGE_BUCKETS.md) guide
2. Verify bucket exists and policies are configured
3. Review troubleshooting section

### "I'm getting environment variable errors"

1. Check that `.env.local` exists
2. Verify variable names match exactly (case-sensitive)
3. Restart the development server
4. See [Supabase Setup Guide](SUPABASE_SETUP.md#troubleshooting)

---

## Architecture Overview

AudioGraph is built with:

- **Frontend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **Analytics**: Client-side with D3.js
- **Feedback**: Linear API integration

### Key Features

1. **Spotify Listening History Import**
   - Upload JSON files from Spotify data export
   - Batch processing (500 records per batch)
   - Automatic deduplication

2. **Analytics Dashboard**
   - Pre-aggregated views for performance
   - Time-windowed queries
   - Interactive visualizations

3. **Listening History Search**
   - Full-text search on artists and tracks
   - Date filtering
   - Paginated results

4. **Feedback System**
   - Screenshot uploads
   - Linear issue creation
   - Anonymous or authenticated submissions

---

## Environment Variables

All required and optional environment variables:

### Required

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Optional (for feedback feature)

```bash
LINEAR_API_KEY=your_linear_api_key
LINEAR_TEAM_ID=your_linear_team_id
LINEAR_PARENT_ISSUE_ID=your_parent_issue_id  # defaults to CRO-558
```

See [.env.example](../.env.example) for detailed descriptions.

---

## Database Migrations

Migrations are located in `supabase/migrations/`:

- **`20250116_analytics_aggregation.sql`** - Analytics views, functions, and indexes

To apply migrations:

```bash
# Using Supabase CLI (recommended)
supabase db push

# Or manually via SQL Editor
# Copy migration contents and run in Supabase dashboard
```

---

## Testing

### Local Testing

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run linter
npm run lint

# Type check
npm run typecheck
```

### Production Build Testing

```bash
# Build for production
npm run build

# Test production build
npm start
```

---

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env.local` to version control
   - Use different Supabase projects for dev/staging/production
   - Rotate keys if exposed

2. **Row Level Security**
   - Always enable RLS on tables
   - Test policies with different user roles
   - Review policies regularly

3. **Storage**
   - Validate file types and sizes
   - Implement rate limiting for uploads
   - Monitor storage usage

4. **API Routes**
   - Validate all inputs
   - Handle errors gracefully
   - Log security events

---

## Performance Optimization

### Database

- Use materialized views for expensive aggregations
- Refresh views after bulk data imports
- Monitor query performance in Supabase dashboard

### Frontend

- Leverage Next.js App Router for caching
- Use React Server Components where possible
- Optimize images and assets

### Storage

- Compress images before upload
- Clean up old files periodically
- Monitor bandwidth usage

---

## Monitoring

### Supabase Dashboard

- Database performance metrics
- API usage and errors
- Storage usage
- Authentication logs

### Application Logs

- Server-side errors in API routes
- Client-side errors in browser console
- Build errors in CI/CD logs

---

## Support & Resources

### Documentation
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

### Community
- [Supabase Discord](https://discord.supabase.com)
- [Next.js Discord](https://nextjs.org/discord)

### Status Pages
- [Supabase Status](https://status.supabase.com)
- [Vercel Status](https://www.vercel-status.com) (if using Vercel)

---

## Contributing

When adding new features:

1. Update relevant documentation
2. Add migrations for database changes
3. Update the deployment checklist if needed
4. Test with a fresh Supabase project

---

## Changelog

### 2025-01-16
- ✅ Added comprehensive Supabase setup guide
- ✅ Created database schema documentation
- ✅ Added storage bucket configuration guide
- ✅ Created deployment checklist
- ✅ Enhanced environment variable validation
- ✅ Improved error messages for missing configuration

---

**Need help?** Check the troubleshooting sections in each guide, or open an issue in the repository.
