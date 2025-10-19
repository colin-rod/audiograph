# Post-Upload Enrichment Setup Guide

This guide will help you set up automatic Spotify enrichment that triggers immediately after file uploads are processed.

## How It Works

1. User uploads Spotify listening history files
2. Files are processed and inserted into the `listens` table
3. **Automatically**, the enrichment process starts in the background
4. Newly inserted records get enriched with Spotify metadata
5. User can view enriched data immediately

## Setup Steps

### Step 1: Deploy the Enrichment Edge Function

```bash
npx supabase functions deploy spotify-enrichment
```

This deploys the Edge Function that handles enrichment.

### Step 2: Set Environment Variables for Edge Function

In your Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions**
2. Add these secrets:

   ```
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   ```

3. Click **Save**

### Step 3: Redeploy the Process-Files Edge Function

The `process-files` Edge Function has been updated to trigger enrichment automatically.

```bash
npx supabase functions deploy process-files
```

### Step 4: Test the Flow

1. **Sign in with Spotify** (if you haven't already)
   - Go to `/sign-in`
   - Click "Continue with Spotify"
   - This stores your Spotify access tokens

2. **Upload a file**
   - Go to `/upload`
   - Upload a Spotify JSON file
   - Wait for processing to complete

3. **Check the logs** in Supabase Dashboard:
   - Go to **Edge Functions** → **process-files** → **Logs**
   - You should see:
     ```
     All files processed, refreshing analytics views
     Triggering Spotify enrichment for X records
     Enrichment triggered in background
     ```

4. **Verify enrichment happened**:
   - Go to **Edge Functions** → **spotify-enrichment** → **Logs**
   - You should see:
     ```
     Processing X specific listens for user [user-id]
     Enriching X listens
     Enrichment complete: {enriched: X, skipped: Y, ...}
     ```

5. **Check your data**:
   ```sql
   -- In Supabase SQL Editor
   SELECT
     artist,
     track,
     album,
     artist_genres,
     popularity,
     enriched_at
   FROM listens
   WHERE spotify_track_id IS NOT NULL
   ORDER BY enriched_at DESC
   LIMIT 10;
   ```

## What Happens Automatically

After you upload files:

1. ✅ **Upload completes** - All files processed
2. ✅ **Analytics refresh** - Materialized views updated
3. ✅ **Enrichment triggered** - Edge Function called in background
4. ✅ **Records enriched** - Spotify metadata fetched and stored
5. ✅ **Data available** - Genre analytics, popularity scores, etc.

## Configuration

### Adjust Batch Size

The default is 50 records per upload. To change this, edit [process-files/index.ts](supabase/functions/process-files/index.ts):

```typescript
body: JSON.stringify({
  user_id: job.user_id,
  listen_ids: insertedIds,
  batch_size: 100, // ← Change this number
}),
```

### Disable Auto-Enrichment

If you want to disable automatic enrichment temporarily, comment out the enrichment trigger in `process-files/index.ts`:

```typescript
// Trigger Spotify enrichment for newly inserted records
// console.log(`[Job ${job.id}] Triggering Spotify enrichment...`)
// fetch(...).catch(...)
```

Then redeploy:
```bash
npx supabase functions deploy process-files
```

## Monitoring

### Check Enrichment Status

**Via Dashboard Component:**
```tsx
import { SpotifyEnrichment } from '@/components/dashboard/spotify-enrichment'

<SpotifyEnrichment />
```

**Via SQL:**
```sql
-- Overall progress
SELECT * FROM get_enrichment_progress();

-- Recent enrichments
SELECT
  COUNT(*),
  DATE(enriched_at) as date
FROM listens
WHERE enriched_at IS NOT NULL
GROUP BY DATE(enriched_at)
ORDER BY date DESC;
```

### View Logs

**Process-Files Logs:**
- Supabase Dashboard → Edge Functions → process-files → Logs
- Shows upload processing and enrichment trigger

**Enrichment Logs:**
- Supabase Dashboard → Edge Functions → spotify-enrichment → Logs
- Shows actual enrichment progress and results

## Troubleshooting

### "No Spotify token found"

**Problem:** User hasn't signed in with Spotify

**Solution:**
1. Sign in with Spotify provider
2. Check token exists:
   ```sql
   SELECT * FROM spotify_tokens WHERE user_id = 'your-user-id';
   ```

### Enrichment not triggering

**Problem:** Edge Function not called after upload

**Check:**
1. Verify `process-files` is deployed with latest code:
   ```bash
   npx supabase functions deploy process-files
   ```

2. Check logs for "Triggering Spotify enrichment" message

3. Verify `SUPABASE_ANON_KEY` environment variable is set

### Enrichment triggered but no data enriched

**Problem:** Spotify API errors or rate limiting

**Check:**
1. View `spotify-enrichment` logs for errors
2. Verify Spotify credentials are set:
   ```bash
   # In Supabase Dashboard → Edge Functions → Secrets
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...
   ```

3. Check if token needs refresh:
   ```sql
   SELECT user_id, expires_at < NOW() as expired
   FROM spotify_tokens;
   ```

### Records not enriched

**Common reasons:**
- Track not found in Spotify's catalog (regional, very old, or obscure)
- Artist/track name mismatch
- Rate limiting (too many requests)

**Check skipped count:**
- View enrichment logs
- Look for "No match for: [artist] - [track]" messages

## Performance

**Expected enrichment speed:**
- ~170 records per minute (rate limited)
- 2 API calls per record (track search + artist details)
- Small uploads (100 tracks): ~35 seconds
- Medium uploads (500 tracks): ~3 minutes
- Large uploads (5000 tracks): ~30 minutes

**Tips:**
- Enrichment runs in background, doesn't block user
- Multiple uploads are processed sequentially
- Genre analytics available immediately after enrichment

## Advanced: Manual Trigger

You can also manually trigger enrichment via API:

```bash
# Enrich specific records
curl -X POST \
  https://your-project.supabase.co/functions/v1/spotify-enrichment \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "listen_ids": [1, 2, 3, 4, 5],
    "batch_size": 50
  }'

# General enrichment (all users, unenriched records)
curl -X POST \
  https://your-project.supabase.co/functions/v1/spotify-enrichment \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 100}'
```

## Benefits of Post-Upload Enrichment

✅ **Immediate** - Enrichment starts right after upload
✅ **Targeted** - Only enriches newly uploaded data
✅ **Efficient** - No wasted API calls on already-enriched data
✅ **User-friendly** - Genre analytics available immediately
✅ **Background** - Doesn't block the upload flow

## Next Steps

Once post-upload enrichment is working:

1. **Monitor enrichment progress** via dashboard
2. **View genre analytics** in your app
3. **Check popularity insights** and decade breakdowns
4. **Optionally add cron job** for older unenriched data

See [AUTOMATED_ENRICHMENT.md](docs/AUTOMATED_ENRICHMENT.md) for scheduling options.

---

**Setup Complete!** 🎉

Your listening data will now automatically enrich with Spotify metadata after every upload.
