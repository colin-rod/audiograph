# ZIP Upload & Batch Ingestion Feature

## Overview

The upload system now supports **ZIP archives** containing multiple Spotify JSON files, with background job processing for efficient batch ingestion. Users can upload an entire Spotify export ZIP directly without extracting files manually.

## Features

✅ **ZIP Upload Support** - Upload entire Spotify export archives
✅ **Background Processing** - Jobs processed asynchronously via pg-boss queue
✅ **Real-time Progress** - Live status updates with polling
✅ **Automatic Format Detection** - Supports both old and new Spotify formats
✅ **Error Handling** - Comprehensive error messages and retry logic
✅ **Backward Compatible** - Still supports individual JSON file uploads

## Architecture

### Components

1. **Frontend** ([src/app/upload/page.tsx](../src/app/upload/page.tsx))
   - Accepts `.json` or `.zip` files
   - Polls upload job status every 2 seconds
   - Shows real-time progress

2. **API Routes**
   - `POST /api/uploads/zip` - Accepts ZIP upload, queues jobs
   - `GET /api/uploads/[uploadId]/status` - Returns job status

3. **Background Worker** ([src/workers/upload-processor.ts](../src/workers/upload-processor.ts))
   - Processes JSON files from queue
   - Batch inserts (500 records per batch)
   - Updates job progress in real-time

4. **Utilities**
   - **zip-extractor** - Extracts Spotify JSON files from ZIP
   - **spotify-mapper** - Maps Spotify formats to database schema
   - **queue-client** - PostgreSQL-based job queue (pg-boss)

### Database Schema

**Table: `upload_jobs`**
```sql
- id (uuid)
- user_id (uuid)
- status (enum: pending, processing, completed, failed)
- filename (text)
- total_files (int)
- processed_files (int)
- total_records (int)
- error_message (text, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)
```

## Setup Instructions

### 1. Environment Variables

Add to `.env.local`:

```bash
# Required for background worker
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get these from:
- **DATABASE_URL**: Supabase Dashboard → Settings → Database
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase Dashboard → Settings → API

### 2. Apply Database Migration

```bash
# If using Supabase CLI
supabase db push

# Or apply migration manually
psql $DATABASE_URL -f supabase/migrations/20251017120417_upload_jobs.sql
```

### 3. Run the System

**Terminal 1 - Next.js App**
```bash
npm run dev
```

**Terminal 2 - Background Worker**
```bash
npm run worker:dev
```

### 4. Production Deployment

The background worker needs to run as a separate process:

**Option A: Separate Service**
- Deploy worker to Heroku, Railway, Render, etc.
- Set environment variables
- Run: `npm run worker`

**Option B: Docker (if needed later)**
- Create Dockerfile for worker
- Deploy alongside Next.js app

**Option C: Serverless (Future)**
- Use Vercel Background Functions
- Or Supabase Edge Functions (if supported)

## User Flow

### ZIP Upload Flow

1. User uploads ZIP file
2. Frontend sends to `POST /api/uploads/zip`
3. API extracts JSON files, creates `upload_job` record
4. API queues individual file processing jobs
5. Worker processes each file in background
6. Frontend polls `GET /api/uploads/:id/status` every 2s
7. Progress updates in real-time
8. On completion, redirect to dashboard

### JSON Upload Flow (Backward Compatible)

1. User uploads JSON file
2. Frontend processes directly (original behavior)
3. Batch insert to Supabase
4. Redirect to dashboard on completion

## Testing

All utilities have comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- src/lib/upload/zip-extractor.test.ts
npm test -- src/lib/upload/spotify-mapper.test.ts
npm test -- src/lib/queue/client.test.ts
```

**Test Coverage:**
- ✅ ZIP extraction (7 tests)
- ✅ Spotify format mapping (14 tests)
- ✅ Queue client (5 tests)
- **Total: 26 tests passing**

## API Reference

### POST /api/uploads/zip

**Request:**
```typescript
FormData {
  file: File // ZIP file
}
```

**Response:**
```typescript
{
  uploadJobId: string
  totalFiles: number
  message: string
}
```

### GET /api/uploads/:uploadId/status

**Response:**
```typescript
{
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  filename: string
  totalFiles: number
  processedFiles: number
  totalRecords: number
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
}
```

## Spotify Format Support

The system automatically detects and maps both Spotify export formats:

**New Format (2023+)**
```json
{
  "ts": "2024-01-01T00:00:00Z",
  "master_metadata_album_artist_name": "Artist Name",
  "master_metadata_track_name": "Track Name",
  "ms_played": 180000
}
```

**Old Format (pre-2023)**
```json
{
  "endTime": "2024-01-01T00:00:00Z",
  "artistName": "Artist Name",
  "trackName": "Track Name",
  "msPlayed": 180000
}
```

## File Patterns

ZIP files are scanned for these patterns (case-insensitive):
- `StreamingHistory*.json`
- `endsong*.json`

Files in nested directories are also extracted.

## Error Handling

- **ZIP too large** (>100MB): Rejected with error message
- **No Spotify files found**: Clear error message
- **Corrupted ZIP**: Graceful error handling
- **Processing errors**: Job marked as failed with error message
- **Retry logic**: Jobs retry 3 times with exponential backoff

## Performance Optimizations

1. **Batch Inserts**: 500 records per batch
2. **Concurrent Processing**: Worker processes up to 5 jobs concurrently
3. **Deduplication**: Records deduplicated by timestamp+artist+track+ms_played
4. **Analytics Refresh**: `refresh_analytics_views()` called once after all files complete

## Monitoring

Worker logs include:
```
[Worker] Starting upload processor worker...
[Worker] Listening for jobs on queue: process-json-file
[Processor] Processing file 1/5: StreamingHistory_music_0.json
[Processor] Parsed 10000 records from StreamingHistory_music_0.json
[Processor] Inserted 10000/10000 records
[Processor] All files processed, refreshing analytics views
```

## Troubleshooting

**Worker not processing jobs?**
- Check `DATABASE_URL` is set correctly
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
- Check worker logs for errors

**Jobs stuck in 'processing'?**
- Check worker is running
- Review worker logs for errors
- Check database connection

**Frontend not polling?**
- Check browser console for errors
- Verify API routes are accessible
- Check upload_job_id is being set

## Future Enhancements

- [ ] Upload history page (view past uploads)
- [ ] Retry failed uploads from UI
- [ ] Support for other streaming services
- [ ] Bulk upload management
- [ ] Progress notifications via email/push
