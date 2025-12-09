# Spotify Integration Setup Guide

Quick start guide for setting up Spotify API integration in Audiograph.

## Prerequisites

✅ Spotify OAuth configured in Supabase (see [docs/OAUTH_SETUP.md](docs/OAUTH_SETUP.md))
✅ User can sign in with Spotify
✅ Spotify Client ID and Secret available

## Step 1: Environment Variables

Add to your `.env.local`:

```bash
# Spotify Client Credentials
NEXT_PUBLIC_SPOTIFY_CLIENT_ID="your_spotify_client_id_here"
SPOTIFY_CLIENT_SECRET="your_spotify_client_secret_here"
```

**Important:** `SPOTIFY_CLIENT_SECRET` should **never** be exposed to the client. It's only used in server-side API routes for token refresh.

## Step 2: Run Database Migrations

Apply the new migrations to add Spotify integration tables and functions:

```bash
# Push migrations to Supabase
npx supabase db push
```

This will create:
- `spotify_tokens` table
- Additional columns in `listens` table
- Analytics RPC functions (genres, popularity, albums, etc.)

Verify migrations were applied:

```bash
# Check in Supabase dashboard
# Navigate to Database → Tables → should see spotify_tokens
# Navigate to Database → Functions → should see get_top_genres, etc.
```

## Step 3: Update Supabase RLS Policies

The migration automatically creates RLS policies, but verify:

```sql
-- In Supabase SQL Editor, verify these policies exist:
SELECT * FROM pg_policies WHERE tablename = 'spotify_tokens';
SELECT * FROM pg_policies WHERE tablename = 'listens';
```

## Step 4: Deploy Updated Edge Function

The `process-files` Edge Function was updated to track inserted record IDs. Redeploy it:

```bash
# Deploy the updated Edge Function
npx supabase functions deploy process-files
```

## Step 5: Test OAuth Flow

1. Sign out if currently signed in
2. Navigate to `/sign-in`
3. Click "Continue with Spotify"
4. Authorize the app
5. Should redirect to `/dashboard`

Verify token was stored:

```sql
-- In Supabase SQL Editor
SELECT user_id, expires_at, created_at
FROM spotify_tokens;
```

You should see a row with your user ID.

## Step 6: Test Enrichment

### Option A: Via UI Component

Add the enrichment component to your dashboard:

```tsx
// In src/app/dashboard/page.tsx (or wherever you want it)
import { SpotifyEnrichment } from "@/components/dashboard/spotify-enrichment"

export default function Dashboard() {
  return (
    <div>
      <SpotifyEnrichment />
      {/* Other components */}
    </div>
  )
}
```

Navigate to the page and click "Enrich Next 100 Records"

### Option B: Via API

Test the enrichment API directly:

```bash
# Get enrichment progress
curl http://localhost:3000/api/spotify/enrich \
  -H "Cookie: your-session-cookie"

# Trigger enrichment
curl -X POST http://localhost:3000/api/spotify/enrich \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"limit": 10}'
```

## Step 7: Verify Enrichment

Check that data was enriched:

```sql
-- In Supabase SQL Editor
SELECT
  id,
  artist,
  track,
  album,
  artist_genres,
  popularity,
  enriched_at
FROM listens
WHERE spotify_track_id IS NOT NULL
LIMIT 10;
```

You should see:
- `album` filled in
- `artist_genres` as JSON array (e.g., `["indie rock", "alternative"]`)
- `popularity` as integer (0-100)
- `enriched_at` timestamp

## Step 8: Test Genre Analytics

Add genre analytics to your dashboard:

```tsx
import { GenreAnalytics } from "@/components/dashboard/genre-analytics"

export default function Dashboard() {
  return (
    <div>
      <GenreAnalytics limit={10} />
    </div>
  )
}
```

Or test via RPC:

```sql
-- In Supabase SQL Editor
SELECT * FROM get_top_genres(NULL, NULL, 10);
SELECT * FROM get_listening_by_decade(NULL, NULL);
SELECT * FROM get_mainstream_score(NULL, NULL);
```

## Troubleshooting

### "No Spotify token found"

**Problem:** User hasn't authenticated with Spotify

**Solution:**
1. Sign in with Spotify provider
2. Check `spotify_tokens` table to verify token exists

### "Failed to refresh token"

**Problem:** Client secret is missing or incorrect

**Solution:**
1. Verify `SPOTIFY_CLIENT_SECRET` in `.env.local`
2. Restart your dev server
3. Re-authenticate with Spotify

### Enrichment returns 0 results

**Problem:** No unenriched records or all records already enriched

**Solution:**
1. Check enrichment progress: `SELECT * FROM get_enrichment_progress()`
2. Upload new listening data
3. Verify records have non-null `artist` and `track` fields

### "Rate limit exceeded"

**Problem:** Too many API requests to Spotify

**Solution:**
- Wait 1-2 minutes
- Enrichment automatically throttles to ~170 req/min
- Process smaller batches

### Genre analytics returns empty

**Problem:** Data hasn't been enriched with genres yet

**Solution:**
1. Run enrichment first
2. Verify `artist_genres` column is populated
3. Check that genres exist: `SELECT DISTINCT artist_genres FROM listens WHERE artist_genres IS NOT NULL`

## Next Steps

Once setup is complete:

1. **Add Components to Dashboard**
   - [SpotifyEnrichment](src/components/dashboard/spotify-enrichment.tsx) - Shows progress and enrichment button
   - [GenreAnalytics](src/components/dashboard/genre-analytics.tsx) - Displays top genres

2. **Build Custom Analytics**
   - Use RPC functions to create visualizations
   - See [SPOTIFY_INTEGRATION.md](docs/SPOTIFY_INTEGRATION.md) for all available functions

3. **Schedule Background Enrichment** (Optional)
   - Create a cron job to call `/api/spotify/enrich`
   - Automatically enrich new uploads

4. **Explore Advanced Features**
   - Decade analysis
   - Mainstream vs niche score
   - Album analytics with cover art
   - Genre timelines

## Production Deployment

Before deploying to production:

- [ ] Add `SPOTIFY_CLIENT_SECRET` to Vercel/hosting environment variables
- [ ] Verify Spotify redirect URIs include production URL
- [ ] Test enrichment with production data
- [ ] Set up monitoring for API errors
- [ ] Consider rate limiting on enrichment endpoint
- [ ] Add error tracking (Sentry, etc.)

## File Reference

**New Files Created:**
- `supabase/migrations/20251018010000_add_spotify_integration.sql` - Token storage and schema
- `supabase/migrations/20251018020000_add_spotify_analytics.sql` - Analytics functions
- `src/lib/spotify/client.ts` - Spotify API client
- `src/lib/spotify/enrichment.ts` - Enrichment service
- `src/app/api/spotify/enrich/route.ts` - Enrichment API endpoint
- `src/components/dashboard/spotify-enrichment.tsx` - Enrichment UI component
- `src/components/dashboard/genre-analytics.tsx` - Genre analytics UI component
- `docs/SPOTIFY_INTEGRATION.md` - Full documentation

**Modified Files:**
- `src/app/auth/callback/route.ts` - Capture Spotify tokens
- `supabase/functions/process-files/index.ts` - Track inserted IDs

## Support

For detailed documentation, see:
- [Spotify Integration Docs](docs/SPOTIFY_INTEGRATION.md)
- [OAuth Setup Guide](docs/OAUTH_SETUP.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
