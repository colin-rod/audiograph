# Database Schema Documentation

This document describes the complete database schema for AudioGraph, including tables, views, functions, and indexes.

## Table of Contents
- [Tables](#tables)
- [Materialized Views](#materialized-views)
- [Database Functions (RPC)](#database-functions-rpc)
- [Indexes](#indexes)
- [Row Level Security](#row-level-security)

## Tables

### `listens`

Stores Spotify listening history data uploaded by users.

#### Schema

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `bigserial` | Yes | Auto-increment | Primary key |
| `ts` | `timestamptz` | Yes | - | Timestamp when the song was played |
| `artist` | `text` | No | `NULL` | Artist name from Spotify |
| `track` | `text` | No | `NULL` | Track/song name from Spotify |
| `ms_played` | `integer` | No | `NULL` | Duration played in milliseconds |
| `created_at` | `timestamptz` | Yes | `now()` | Record creation timestamp |

#### Creation SQL

```sql
CREATE TABLE listens (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL,
  artist text,
  track text,
  ms_played integer,
  created_at timestamptz DEFAULT now()
);
```

#### Indexes

- `idx_listens_ts` - Index on `ts` for date-based queries
- `idx_listens_artist` - Index on `artist` for artist-based queries
- `idx_listens_track` - Index on `track` for track-based queries
- `idx_listens_ms_played` - Index on `ms_played` for duration queries
- `idx_listens_ts_artist_track` - Composite index for combined queries
- `idx_listens_artist_trgm` - GIN index for full-text search on artist
- `idx_listens_track_trgm` - GIN index for full-text search on track

#### Sample Data

```json
{
  "id": 12345,
  "ts": "2024-01-15T14:30:00Z",
  "artist": "Taylor Swift",
  "track": "Anti-Hero",
  "ms_played": 180000,
  "created_at": "2024-01-16T10:00:00Z"
}
```

#### Usage in Application

- **Upload Page** (`/upload`): Inserts batched listening data (500 records per batch)
- **Dashboard** (`/dashboard`): Queries for analytics and visualization
- **Search**: Full-text search across artist and track names

---

## Materialized Views

Materialized views provide pre-aggregated data for faster dashboard loading.

### `monthly_listening_trends`

Pre-aggregated monthly listening statistics.

#### Schema

| Column | Type | Description |
|--------|------|-------------|
| `month` | `timestamptz` | First day of the month |
| `total_ms_played` | `numeric` | Total milliseconds played in the month |
| `total_hours` | `numeric` | Total hours played (rounded to 1 decimal) |
| `listen_count` | `bigint` | Number of listens in the month |

#### Refresh

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_listening_trends;
```

---

### `top_artists_all_time`

Top 100 artists by total listening time (all-time).

#### Schema

| Column | Type | Description |
|--------|------|-------------|
| `artist` | `text` | Artist name |
| `total_ms_played` | `numeric` | Total milliseconds played |
| `total_hours` | `numeric` | Total hours played (rounded to 1 decimal) |
| `listen_count` | `bigint` | Number of listens |

---

### `top_tracks_all_time`

Top 100 tracks by total listening time (all-time).

#### Schema

| Column | Type | Description |
|--------|------|-------------|
| `track` | `text` | Track name |
| `artist` | `text` | Artist name |
| `total_ms_played` | `numeric` | Total milliseconds played |
| `total_hours` | `numeric` | Total hours played (rounded to 1 decimal) |
| `listen_count` | `bigint` | Number of listens |

---

### `listening_clock_all_time`

Listening patterns aggregated by day of week and hour of day.

#### Schema

| Column | Type | Description |
|--------|------|-------------|
| `day_of_week` | `integer` | 0=Sunday, 1=Monday, ..., 6=Saturday |
| `hour_of_day` | `integer` | 0-23 (24-hour format) |
| `total_ms_played` | `numeric` | Total milliseconds played |
| `total_hours` | `numeric` | Total hours played (rounded to 1 decimal) |
| `listen_count` | `bigint` | Number of listens |

#### Usage

Used to generate heatmap visualizations showing when users listen to music most.

---

### `dashboard_summary_all_time`

Overall statistics for the dashboard summary card.

#### Schema

| Column | Type | Description |
|--------|------|-------------|
| `total_ms_played` | `numeric` | Total milliseconds played |
| `total_hours` | `numeric` | Total hours played (rounded to 1 decimal) |
| `unique_artists` | `bigint` | Count of unique artists |
| `unique_tracks` | `bigint` | Count of unique tracks |
| `total_listens` | `bigint` | Total number of listens |
| `first_listen` | `timestamptz` | Timestamp of earliest listen |
| `last_listen` | `timestamptz` | Timestamp of most recent listen |

---

## Database Functions (RPC)

These PostgreSQL functions can be called from the application using Supabase RPC.

### `get_dashboard_summary(start_date, end_date)`

Get dashboard summary statistics with optional time window filtering.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start_date` | `timestamptz` | No | `NULL` | Start of time window (inclusive) |
| `end_date` | `timestamptz` | No | `NULL` | End of time window (exclusive) |

#### Returns

| Column | Type | Description |
|--------|------|-------------|
| `total_hours` | `numeric` | Total hours played |
| `unique_artists` | `bigint` | Count of unique artists |
| `unique_tracks` | `bigint` | Count of unique tracks |
| `total_listens` | `bigint` | Total number of listens |
| `top_artist` | `text` | Most played artist |
| `most_active_year` | `text` | Year with most listening time |

#### Usage Example

```javascript
const { data, error } = await supabase.rpc('get_dashboard_summary', {
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2025-01-01T00:00:00Z'
})
```

---

### `get_top_artists(start_date, end_date, limit_count, offset_count)`

Get top artists with pagination and time window filtering.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start_date` | `timestamptz` | No | `NULL` | Start of time window |
| `end_date` | `timestamptz` | No | `NULL` | End of time window |
| `limit_count` | `integer` | No | `5` | Number of results to return |
| `offset_count` | `integer` | No | `0` | Number of results to skip |

#### Returns

| Column | Type | Description |
|--------|------|-------------|
| `artist` | `text` | Artist name |
| `total_hours` | `numeric` | Total hours played |
| `listen_count` | `bigint` | Number of listens |

#### Usage Example

```javascript
const { data, error } = await supabase.rpc('get_top_artists', {
  start_date: null,
  end_date: null,
  limit_count: 10,
  offset_count: 0
})
```

---

### `get_top_tracks(start_date, end_date, limit_count, offset_count)`

Get top tracks with pagination and time window filtering.

#### Parameters

Same as `get_top_artists`.

#### Returns

| Column | Type | Description |
|--------|------|-------------|
| `track` | `text` | Track name |
| `artist` | `text` | Artist name |
| `total_hours` | `numeric` | Total hours played |
| `listen_count` | `bigint` | Number of listens |

---

### `get_listening_trends(start_date, end_date)`

Get monthly listening trends with time window filtering.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start_date` | `timestamptz` | No | `NULL` | Start of time window |
| `end_date` | `timestamptz` | No | `NULL` | End of time window |

#### Returns

| Column | Type | Description |
|--------|------|-------------|
| `month` | `timestamptz` | First day of the month |
| `total_hours` | `numeric` | Total hours played in the month |
| `listen_count` | `bigint` | Number of listens in the month |

---

### `get_weekly_listening_trends(start_date, end_date)`

Get weekly listening trends with time window filtering.

#### Parameters

Same as `get_listening_trends`.

#### Returns

| Column | Type | Description |
|--------|------|-------------|
| `week_start` | `timestamptz` | Beginning of the ISO week |
| `week_end` | `timestamptz` | End of the ISO week |
| `week_number` | `integer` | ISO week number |
| `year` | `integer` | ISO year for the week |
| `total_hours` | `numeric` | Total hours played in the week |
| `listen_count` | `bigint` | Number of listens in the week |

---

### `get_listening_streaks(start_date, end_date)`

Get longest and current listening streak statistics with time window filtering.

#### Parameters

Same as `get_listening_trends`.

#### Returns

| Column | Type | Description |
|--------|------|-------------|
| `longest_streak` | `integer` | Length of the longest streak in days |
| `longest_streak_start` | `date` | Start of the longest streak |
| `longest_streak_end` | `date` | End of the longest streak |
| `current_streak` | `integer` | Length of the current streak in days |
| `current_streak_start` | `date` | Start of the current streak |
| `current_streak_end` | `date` | End of the current streak |

---

### `get_listening_clock(start_date, end_date)`

Get listening clock heatmap data with time window filtering.

#### Parameters

Same as `get_listening_trends`.

#### Returns

| Column | Type | Description |
|--------|------|-------------|
| `day_of_week` | `integer` | 0-6 (0=Sunday) |
| `hour_of_day` | `integer` | 0-23 |
| `total_hours` | `numeric` | Total hours played |
| `listen_count` | `bigint` | Number of listens |

---

### `get_listening_history(search_query, start_date, end_date, limit_count, offset_count)`

Get paginated listening history with search and date filtering.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `search_query` | `text` | No | `NULL` | Search term for artist or track |
| `start_date` | `timestamptz` | No | `NULL` | Start of time window |
| `end_date` | `timestamptz` | No | `NULL` | End of time window |
| `limit_count` | `integer` | No | `50` | Number of results per page |
| `offset_count` | `integer` | No | `0` | Number of results to skip |

#### Returns

| Column | Type | Description |
|--------|------|-------------|
| `track` | `text` | Track name |
| `artist` | `text` | Artist name |
| `ts` | `timestamptz` | Timestamp when played |
| `ms_played` | `integer` | Milliseconds played |
| `total_count` | `bigint` | Total matching records (for pagination) |

#### Usage Example

```javascript
const { data, error } = await supabase.rpc('get_listening_history', {
  search_query: 'Swift',
  start_date: null,
  end_date: null,
  limit_count: 50,
  offset_count: 0
})
```

---

### `get_available_timeframes()`

Get list of available years and months with listening data.

#### Parameters

None.

#### Returns

| Column | Type | Description |
|--------|------|-------------|
| `year` | `integer` | Year |
| `month` | `integer` | Month (1-12) |
| `listen_count` | `bigint` | Number of listens in that month |
| `total_hours` | `numeric` | Total hours in that month |

#### Usage

Used to populate date filter dropdowns in the UI.

---

### `refresh_analytics_views()`

Refresh all analytics materialized views.

#### Parameters

None.

#### Returns

`void`

#### Usage

Should be called after bulk data imports to update pre-aggregated views.

```javascript
const { error } = await supabase.rpc('refresh_analytics_views')
```

---

## Indexes

### Performance Indexes

All indexes are created with `WHERE` clauses to exclude NULL values, reducing index size and improving performance.

```sql
-- Single-column indexes
CREATE INDEX idx_listens_ts ON listens(ts) WHERE ts IS NOT NULL;
CREATE INDEX idx_listens_artist ON listens(artist) WHERE artist IS NOT NULL;
CREATE INDEX idx_listens_track ON listens(track) WHERE track IS NOT NULL;
CREATE INDEX idx_listens_ms_played ON listens(ms_played) WHERE ms_played IS NOT NULL;

-- Composite index for combined queries
CREATE INDEX idx_listens_ts_artist_track ON listens(ts, artist, track)
  WHERE ts IS NOT NULL AND artist IS NOT NULL AND track IS NOT NULL;

-- Full-text search indexes (requires pg_trgm extension)
CREATE INDEX idx_listens_artist_trgm ON listens USING gin(artist gin_trgm_ops)
  WHERE artist IS NOT NULL;
CREATE INDEX idx_listens_track_trgm ON listens USING gin(track gin_trgm_ops)
  WHERE track IS NOT NULL;
```

---

## Row Level Security

Row Level Security (RLS) controls access to data at the database level.

### Recommended Policies

#### Allow Authenticated Access

```sql
ALTER TABLE listens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to listens"
  ON listens
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

#### User-Specific Data (Multi-Tenant)

For applications where each user should only see their own data:

```sql
-- Add user_id column
ALTER TABLE listens ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Create policy for user-specific access
CREATE POLICY "Users can only access their own listens"
  ON listens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### Public Read Access (Optional)

For public dashboards:

```sql
CREATE POLICY "Allow public read access to listens"
  ON listens
  FOR SELECT
  TO anon
  USING (true);
```

### Storage Bucket Policies

For the `feedback-screenshots` bucket:

```sql
-- Public read access
CREATE POLICY "Public read access for feedback screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'feedback-screenshots');

-- Authenticated uploads
CREATE POLICY "Allow authenticated uploads to feedback screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-screenshots');

-- Anonymous uploads (optional, for unauthenticated feedback)
CREATE POLICY "Allow anonymous uploads to feedback screenshots"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'feedback-screenshots');
```

---

## Data Types

### Timestamp Format

All timestamps use `timestamptz` (timestamp with time zone) for accurate time tracking across different time zones.

Example: `2024-01-15T14:30:00+00:00`

### Duration Format

Durations are stored in milliseconds as `integer`.

- 1 second = 1,000 ms
- 1 minute = 60,000 ms
- 1 hour = 3,600,000 ms

Convert to hours: `ms_played / 3600000.0`

---

## Best Practices

### Data Import

1. **Batch Inserts**: Insert data in batches of 500 records for optimal performance
2. **Deduplication**: Check for existing records before inserting
3. **Refresh Views**: Call `refresh_analytics_views()` after bulk imports

### Queries

1. **Use RPC Functions**: For complex aggregations, use the provided RPC functions
2. **Time Windows**: Always specify time windows for large datasets
3. **Pagination**: Use `limit` and `offset` for paginated results
4. **Indexes**: Queries on `ts`, `artist`, and `track` are optimized with indexes

### Maintenance

1. **Vacuum**: Run `VACUUM ANALYZE listens` periodically for large tables
2. **Materialized Views**: Refresh views daily or after significant data changes
3. **Monitoring**: Monitor index usage and query performance in Supabase dashboard

---

## Migration Files

All database migrations are located in:
```
supabase/migrations/
├── 20250116_analytics_aggregation.sql
```

To apply migrations:

```bash
# Using Supabase CLI
supabase db push

# Or manually in SQL Editor
# Copy contents of migration file and execute
```

---

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [PostGIS & Extensions](https://supabase.com/docs/guides/database/extensions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
