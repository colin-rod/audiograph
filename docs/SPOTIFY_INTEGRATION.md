# Spotify API Integration

This document explains how the Spotify Web API integration enriches Audiograph's listening data with additional metadata including genres, album information, popularity scores, and more.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Setup](#setup)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Usage](#usage)
- [Analytics Functions](#analytics-functions)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)

## Overview

The Spotify integration enhances basic listening history (artist, track, timestamp) with rich metadata from Spotify's catalog:

- **Genres** - Artist genres for music taste analysis
- **Album Data** - Album names, release dates, and cover artwork
- **Popularity Scores** - Track and artist popularity metrics
- **Enhanced Insights** - Mainstream vs. niche preferences, decade analysis, music discovery scores

## Features

### ✅ Currently Available

1. **OAuth Token Storage**
   - Automatic capture of Spotify access and refresh tokens during sign-in
   - Secure token storage with automatic refresh
   - RLS policies ensure users can only access their own tokens

2. **Data Enrichment**
   - Search Spotify's catalog to match artist/track names
   - Fetch track metadata (album, release date, popularity, explicit flag)
   - Batch fetch artist data (genres, popularity, images)
   - Rate-limited to respect Spotify's API limits (~170 requests/min)

3. **Genre Analytics**
   - Top genres by listening time
   - Genre timeline showing preferences over time
   - Unique artist counts per genre

4. **Release Year Analytics**
   - Listening by decade distribution
   - Music discovery score (% of current year releases)
   - Percentage breakdowns

5. **Popularity Insights**
   - Average track and artist popularity
   - Mainstream percentage (popularity ≥ 70)
   - Niche percentage (popularity < 40)

6. **Album Analytics**
   - Top albums with cover artwork
   - Release dates and listening stats
   - Track counts per album

7. **Enhanced Artist Insights**
   - Artist genres and popularity
   - Unique track counts per artist
   - Rich metadata for visualizations

### ❌ Not Available (API Deprecated)

As of November 27, 2024, Spotify deprecated the following endpoints:

- **Audio Features** - Danceability, energy, tempo, acousticness
- **Audio Analysis** - Beat-by-beat analysis, detailed song structure

These features may return in the future via alternative Spotify APIs.

## Setup

### 1. Prerequisites

You must have Spotify OAuth configured in Supabase (see [OAUTH_SETUP.md](./OAUTH_SETUP.md)).

### 2. Environment Variables

Add the following to your `.env.local`:

```bash
# Spotify Client Credentials (for token refresh)
NEXT_PUBLIC_SPOTIFY_CLIENT_ID="your_spotify_client_id"
SPOTIFY_CLIENT_SECRET="your_spotify_client_secret"
```

### 3. Database Migrations

Run the Spotify integration migrations:

```bash
supabase db push
```

This creates:
- `spotify_tokens` table for storing OAuth tokens
- Additional columns in `listens` table for Spotify metadata
- RPC functions for analytics

### 4. Sign In with Spotify

Users must sign in with Spotify (or link their account) to enable enrichment:

1. Navigate to `/sign-in`
2. Click "Continue with Spotify"
3. Grant permissions
4. Tokens are automatically stored

## Database Schema

### New Table: `spotify_tokens`

```sql
CREATE TABLE spotify_tokens (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Extended `listens` Table

New columns added:

| Column | Type | Description |
|--------|------|-------------|
| `spotify_track_id` | `text` | Spotify track ID |
| `spotify_artist_id` | `text` | Spotify artist ID |
| `album` | `text` | Album name |
| `release_date` | `date` | Album/track release date |
| `popularity` | `integer` | Track popularity (0-100) |
| `explicit` | `boolean` | Whether track is explicit |
| `artist_genres` | `jsonb` | Array of genre strings |
| `artist_popularity` | `integer` | Artist popularity (0-100) |
| `album_image_url` | `text` | URL to album artwork |
| `enriched_at` | `timestamptz` | When enrichment occurred |

## API Endpoints

### GET `/api/spotify/enrich`

Get enrichment progress for the current user.

**Response:**
```json
{
  "total_listens": 5000,
  "enriched_listens": 3200,
  "percentage": 64
}
```

### POST `/api/spotify/enrich`

Start enrichment process for unenriched records.

**Request Body:**
```json
{
  "limit": 100  // Number of records to enrich (1-500)
}
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 100,
    "enriched": 85,
    "failed": 5,
    "skipped": 10
  }
}
```

## Usage

### 1. Trigger Enrichment

Use the `SpotifyEnrichment` component in your dashboard:

```tsx
import { SpotifyEnrichment } from "@/components/dashboard/spotify-enrichment"

export default function DashboardPage() {
  return (
    <div>
      <SpotifyEnrichment />
      {/* Other dashboard content */}
    </div>
  )
}
```

This displays:
- Enrichment progress bar
- Button to enrich next 100 records
- Status messages

### 2. Display Genre Analytics

Use the `GenreAnalytics` component:

```tsx
import { GenreAnalytics } from "@/components/dashboard/genre-analytics"

export default function AnalyticsPage() {
  return (
    <GenreAnalytics
      startDate="2024-01-01T00:00:00Z"
      endDate="2025-01-01T00:00:00Z"
      limit={10}
    />
  )
}
```

### 3. Programmatic Enrichment

Use the enrichment service directly:

```typescript
import { enrichListens, enrichSpecificListens } from "@/lib/spotify/enrichment"

// Enrich next 100 unenriched records
const stats = await enrichListens(100, (progress) => {
  console.log(`Enriched ${progress.enriched}/${progress.total}`)
})

// Enrich specific records by ID
const listenIds = [1, 2, 3, 4, 5]
await enrichSpecificListens(listenIds)
```

## Analytics Functions

All analytics functions respect Row Level Security and only return data for the authenticated user.

### `get_top_genres(start_date, end_date, limit_count)`

Get top genres by listening time.

**Parameters:**
- `start_date`: `timestamptz` (optional) - Start of time window
- `end_date`: `timestamptz` (optional) - End of time window
- `limit_count`: `integer` (optional, default: 10) - Number of results

**Returns:**
```typescript
{
  genre: string
  total_hours: number
  listen_count: number
  unique_artists: number
}[]
```

**Example:**
```typescript
const { data } = await supabase.rpc('get_top_genres', {
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2025-01-01T00:00:00Z',
  limit_count: 10
})
```

### `get_genre_timeline(target_genre, start_date, end_date)`

Get monthly listening trends for a specific genre.

**Example:**
```typescript
const { data } = await supabase.rpc('get_genre_timeline', {
  target_genre: 'indie rock',
  start_date: null,
  end_date: null
})
```

### `get_listening_by_decade(start_date, end_date)`

Get listening distribution by decade.

**Returns:**
```typescript
{
  decade: string       // "2020s", "2010s", etc.
  total_hours: number
  listen_count: number
  percentage: number
}[]
```

### `get_discovery_score(start_date, end_date)`

Get music discovery score (% of current year music).

**Returns:**
```typescript
{
  current_year_percentage: number
  new_music_hours: number
  total_hours: number
}
```

### `get_mainstream_score(start_date, end_date)`

Get mainstream vs. niche listening preferences.

**Returns:**
```typescript
{
  avg_track_popularity: number
  avg_artist_popularity: number
  mainstream_percentage: number  // Popularity ≥ 70
  niche_percentage: number        // Popularity < 40
}
```

### `get_top_albums(start_date, end_date, limit_count)`

Get top albums with cover art and metadata.

**Returns:**
```typescript
{
  album: string
  artist: string
  total_hours: number
  listen_count: number
  album_image_url: string
  release_date: date
}[]
```

### `get_top_artists_enhanced(start_date, end_date, limit_count)`

Get top artists with genres and popularity.

**Returns:**
```typescript
{
  artist: string
  total_hours: number
  listen_count: number
  artist_genres: string[]
  artist_popularity: number
  unique_tracks: number
}[]
```

## Limitations

### Rate Limits

Spotify enforces ~180 requests per minute. The enrichment service:
- Adds 350ms delay between requests (~170 requests/min)
- Processes in batches to avoid hitting limits
- Automatically retries on 429 (rate limit) errors

### API Deprecations

As of November 27, 2024:
- ❌ Audio features API is deprecated (danceability, energy, tempo)
- ❌ Audio analysis API is deprecated
- ✅ Track/artist metadata still available
- ✅ Genre data available through artist endpoints

### Genre Data

- Genres are artist-level, not track-level
- Not all artists have genre classifications
- Genre strings are Spotify's proprietary categories

### Matching Accuracy

- Track search uses artist + track name
- May not find exact matches for:
  - Misspelled artist/track names
  - Special characters or formatting differences
  - Regional variations
  - Very obscure tracks

## Troubleshooting

### "No Spotify token found"

**Cause:** User hasn't signed in with Spotify

**Solution:**
1. Sign in with Spotify provider
2. Or link Spotify account in user settings

### "Failed to refresh Spotify token"

**Cause:** Refresh token expired or invalid

**Solution:**
1. Sign out and sign in with Spotify again
2. Check Spotify client credentials in `.env.local`

### "Rate limit exceeded"

**Cause:** Too many API requests in a short time

**Solution:**
- Wait a few minutes and try again
- The enrichment service automatically throttles requests
- Reduce batch size if manually enriching

### "No Spotify match found"

**Cause:** Track/artist not found in Spotify's catalog

**Solution:**
- This is expected for some tracks (regional exclusives, very old music, etc.)
- These records are skipped during enrichment
- Check the `skipped` count in enrichment stats

### Enrichment is slow

**Expected behavior** - Enrichment processes ~170 records per minute due to:
- Rate limiting (350ms between requests)
- Two API calls per record (search + artist details)

**Tips:**
- Run enrichment in background
- Process in multiple batches over time
- Consider scheduled enrichment for large datasets

## Best Practices

1. **Incremental Enrichment**
   - Enrich in batches of 100-500 records
   - Run multiple times rather than all at once
   - Monitor progress via the enrichment component

2. **Token Management**
   - Tokens auto-refresh 5 minutes before expiry
   - If experiencing issues, re-authenticate with Spotify

3. **Performance**
   - Use RPC functions for analytics (pre-optimized)
   - Leverage GIN indexes on `artist_genres` for fast queries
   - Cache results client-side when appropriate

4. **Privacy**
   - All data is user-specific (RLS enforced)
   - Tokens are encrypted at rest in Supabase
   - Never expose `SPOTIFY_CLIENT_SECRET` in client code

## Future Enhancements

Potential features if Spotify API evolves:

- [ ] Auto-sync recently played tracks
- [ ] Playlist generation based on genres
- [ ] Audio feature analysis (if API returns)
- [ ] Artist/album follow integration
- [ ] Recommendations based on listening history

## Additional Resources

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [Spotify Authorization Guide](https://developer.spotify.com/documentation/general/guides/authorization/)
- [Spotify Rate Limits](https://developer.spotify.com/documentation/web-api/concepts/rate-limits)
- [OAuth Setup Guide](./OAUTH_SETUP.md)

## Support

For issues related to Spotify integration:

1. Check Spotify token status in `spotify_tokens` table
2. Verify Spotify client credentials
3. Review browser console for API errors
4. Check Supabase logs for RPC function errors
