-- Analytics Aggregation Migration
-- This migration hardens analytics by moving aggregation into the database
-- using materialized views and RPC functions for efficient querying

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable pg_trgm extension for text search (trigram matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- MATERIALIZED VIEWS FOR PRE-AGGREGATED DATA
-- ============================================================================

-- 1. Monthly listening trends aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_listening_trends AS
SELECT
  date_trunc('month', ts) as month,
  SUM(ms_played) as total_ms_played,
  ROUND((SUM(ms_played) / 3600000.0)::numeric, 1) as total_hours,
  COUNT(*) as listen_count
FROM listens
WHERE ts IS NOT NULL AND ms_played IS NOT NULL
GROUP BY date_trunc('month', ts)
ORDER BY month;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_monthly_trends_month ON monthly_listening_trends(month);

-- 2. Top artists aggregation (all-time)
CREATE MATERIALIZED VIEW IF NOT EXISTS top_artists_all_time AS
SELECT
  artist,
  SUM(ms_played) as total_ms_played,
  ROUND((SUM(ms_played) / 3600000.0)::numeric, 1) as total_hours,
  COUNT(*) as listen_count
FROM listens
WHERE artist IS NOT NULL AND ms_played IS NOT NULL
GROUP BY artist
ORDER BY total_ms_played DESC
LIMIT 100;

-- 3. Top tracks aggregation (all-time)
CREATE MATERIALIZED VIEW IF NOT EXISTS top_tracks_all_time AS
SELECT
  track,
  artist,
  SUM(ms_played) as total_ms_played,
  ROUND((SUM(ms_played) / 3600000.0)::numeric, 1) as total_hours,
  COUNT(*) as listen_count
FROM listens
WHERE track IS NOT NULL AND ms_played IS NOT NULL
GROUP BY track, artist
ORDER BY total_ms_played DESC
LIMIT 100;

-- 4. Listening clock heatmap aggregation (day/hour)
CREATE MATERIALIZED VIEW IF NOT EXISTS listening_clock_all_time AS
SELECT
  EXTRACT(DOW FROM ts)::int as day_of_week,
  EXTRACT(HOUR FROM ts)::int as hour_of_day,
  SUM(ms_played) as total_ms_played,
  ROUND((SUM(ms_played) / 3600000.0)::numeric, 1) as total_hours,
  COUNT(*) as listen_count
FROM listens
WHERE ts IS NOT NULL AND ms_played IS NOT NULL
GROUP BY day_of_week, hour_of_day
ORDER BY day_of_week, hour_of_day;

-- 5. Dashboard summary statistics (all-time)
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_summary_all_time AS
SELECT
  SUM(ms_played) as total_ms_played,
  ROUND((SUM(ms_played) / 3600000.0)::numeric, 1) as total_hours,
  COUNT(DISTINCT artist) FILTER (WHERE artist IS NOT NULL) as unique_artists,
  COUNT(DISTINCT track) FILTER (WHERE track IS NOT NULL) as unique_tracks,
  COUNT(*) as total_listens,
  MIN(ts) as first_listen,
  MAX(ts) as last_listen
FROM listens
WHERE ms_played IS NOT NULL;

-- ============================================================================
-- RPC FUNCTIONS FOR TIME-WINDOWED QUERIES
-- ============================================================================

-- 1. Get dashboard summary for a time window
CREATE OR REPLACE FUNCTION get_dashboard_summary(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  total_hours numeric,
  unique_artists bigint,
  unique_tracks bigint,
  total_listens bigint,
  top_artist text,
  most_active_year text
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_data AS (
    SELECT
      ms_played,
      artist,
      track,
      ts
    FROM listens
    WHERE
      ms_played IS NOT NULL
      AND (start_date IS NULL OR ts >= start_date)
      AND (end_date IS NULL OR ts < end_date)
  ),
  summary AS (
    SELECT
      ROUND((SUM(ms_played) / 3600000.0)::numeric, 1) as total_hours,
      COUNT(DISTINCT artist) FILTER (WHERE artist IS NOT NULL) as unique_artists,
      COUNT(DISTINCT track) FILTER (WHERE track IS NOT NULL) as unique_tracks,
      COUNT(*) as total_listens
    FROM filtered_data
  ),
  top_artist_data AS (
    SELECT artist
    FROM filtered_data
    WHERE artist IS NOT NULL
    GROUP BY artist
    ORDER BY SUM(ms_played) DESC, artist ASC
    LIMIT 1
  ),
  most_active_year_data AS (
    SELECT EXTRACT(YEAR FROM ts)::text as year
    FROM filtered_data
    WHERE ts IS NOT NULL
    GROUP BY year
    ORDER BY SUM(ms_played) DESC, year ASC
    LIMIT 1
  )
  SELECT
    s.total_hours,
    s.unique_artists,
    s.unique_tracks,
    s.total_listens,
    ta.artist as top_artist,
    my.year as most_active_year
  FROM summary s
  CROSS JOIN LATERAL (SELECT artist FROM top_artist_data) ta
  CROSS JOIN LATERAL (SELECT year FROM most_active_year_data) my;
END;
$$;

-- 2. Get top artists with pagination and time window
CREATE OR REPLACE FUNCTION get_top_artists(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL,
  limit_count int DEFAULT 5,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  artist text,
  total_hours numeric,
  listen_count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    artist,
    ROUND((SUM(ms_played) / 3600000.0)::numeric, 1) as total_hours,
    COUNT(*) as listen_count
  FROM listens
  WHERE
    artist IS NOT NULL
    AND ms_played IS NOT NULL
    AND (start_date IS NULL OR ts >= start_date)
    AND (end_date IS NULL OR ts < end_date)
  GROUP BY artist
  ORDER BY SUM(ms_played) DESC, artist ASC
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- 3. Get top tracks with pagination and time window
CREATE OR REPLACE FUNCTION get_top_tracks(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL,
  limit_count int DEFAULT 5,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  track text,
  artist text,
  total_hours numeric,
  listen_count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    track,
    artist,
    ROUND((SUM(ms_played) / 3600000.0)::numeric, 1) as total_hours,
    COUNT(*) as listen_count
  FROM listens
  WHERE
    track IS NOT NULL
    AND ms_played IS NOT NULL
    AND (start_date IS NULL OR ts >= start_date)
    AND (end_date IS NULL OR ts < end_date)
  GROUP BY track, artist
  ORDER BY SUM(ms_played) DESC, track ASC
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- 4. Get listening trends by month with time window
CREATE OR REPLACE FUNCTION get_listening_trends(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  month timestamptz,
  total_hours numeric,
  listen_count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    date_trunc('month', ts) as month,
    ROUND((SUM(ms_played) / 3600000.0)::numeric, 1) as total_hours,
    COUNT(*) as listen_count
  FROM listens
  WHERE
    ts IS NOT NULL
    AND ms_played IS NOT NULL
    AND (start_date IS NULL OR ts >= start_date)
    AND (end_date IS NULL OR ts < end_date)
  GROUP BY date_trunc('month', ts)
  ORDER BY month ASC;
$$;

-- 5. Get listening clock heatmap with time window
CREATE OR REPLACE FUNCTION get_listening_clock(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  day_of_week int,
  hour_of_day int,
  total_hours numeric,
  listen_count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXTRACT(DOW FROM ts)::int as day_of_week,
    EXTRACT(HOUR FROM ts)::int as hour_of_day,
    ROUND((SUM(ms_played) / 3600000.0)::numeric, 1) as total_hours,
    COUNT(*) as listen_count
  FROM listens
  WHERE
    ts IS NOT NULL
    AND ms_played IS NOT NULL
    AND (start_date IS NULL OR ts >= start_date)
    AND (end_date IS NULL OR ts < end_date)
  GROUP BY day_of_week, hour_of_day
  ORDER BY day_of_week, hour_of_day;
$$;

-- 6. Get paginated listening history with search and date filtering
CREATE OR REPLACE FUNCTION get_listening_history(
  search_query text DEFAULT NULL,
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL,
  limit_count int DEFAULT 50,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  track text,
  artist text,
  ts timestamptz,
  ms_played int,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_count_val bigint;
BEGIN
  -- Get total count for pagination
  SELECT COUNT(*) INTO total_count_val
  FROM listens
  WHERE
    (search_query IS NULL OR
     track ILIKE '%' || search_query || '%' OR
     artist ILIKE '%' || search_query || '%')
    AND (start_date IS NULL OR ts >= start_date)
    AND (end_date IS NULL OR ts < end_date);

  -- Return paginated results with total count
  RETURN QUERY
  SELECT
    l.track,
    l.artist,
    l.ts,
    l.ms_played,
    total_count_val as total_count
  FROM listens l
  WHERE
    (search_query IS NULL OR
     l.track ILIKE '%' || search_query || '%' OR
     l.artist ILIKE '%' || search_query || '%')
    AND (start_date IS NULL OR l.ts >= start_date)
    AND (end_date IS NULL OR l.ts < end_date)
  ORDER BY l.ts DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- 7. Get available timeframe options (years and months with data)
CREATE OR REPLACE FUNCTION get_available_timeframes()
RETURNS TABLE (
  year int,
  month int,
  listen_count bigint,
  total_hours numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXTRACT(YEAR FROM ts)::int as year,
    EXTRACT(MONTH FROM ts)::int as month,
    COUNT(*) as listen_count,
    ROUND((SUM(ms_played) / 3600000.0)::numeric, 1) as total_hours
  FROM listens
  WHERE ts IS NOT NULL AND ms_played IS NOT NULL
  GROUP BY year, month
  ORDER BY year DESC, month DESC;
$$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Add indexes on the listens table for common query patterns
CREATE INDEX IF NOT EXISTS idx_listens_ts ON listens(ts) WHERE ts IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listens_artist ON listens(artist) WHERE artist IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listens_track ON listens(track) WHERE track IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listens_ms_played ON listens(ms_played) WHERE ms_played IS NOT NULL;

-- Composite index for common filtering patterns
CREATE INDEX IF NOT EXISTS idx_listens_ts_artist_track ON listens(ts, artist, track)
  WHERE ts IS NOT NULL AND artist IS NOT NULL AND track IS NOT NULL;

-- Text search indexes
CREATE INDEX IF NOT EXISTS idx_listens_artist_trgm ON listens USING gin(artist gin_trgm_ops)
  WHERE artist IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listens_track_trgm ON listens USING gin(track gin_trgm_ops)
  WHERE track IS NOT NULL;

-- ============================================================================
-- REFRESH FUNCTION FOR MATERIALIZED VIEWS
-- ============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_listening_trends;
  REFRESH MATERIALIZED VIEW CONCURRENTLY top_artists_all_time;
  REFRESH MATERIALIZED VIEW CONCURRENTLY top_tracks_all_time;
  REFRESH MATERIALIZED VIEW CONCURRENTLY listening_clock_all_time;
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_summary_all_time;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Note: Assuming listens table already has RLS enabled.
-- If using materialized views in client queries, you may need to grant access:

-- Grant access to materialized views (adjust for your auth setup)
-- GRANT SELECT ON monthly_listening_trends TO authenticated;
-- GRANT SELECT ON top_artists_all_time TO authenticated;
-- GRANT SELECT ON top_tracks_all_time TO authenticated;
-- GRANT SELECT ON listening_clock_all_time TO authenticated;
-- GRANT SELECT ON dashboard_summary_all_time TO authenticated;

-- Grant execute on RPC functions
-- GRANT EXECUTE ON FUNCTION get_dashboard_summary TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_top_artists TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_top_tracks TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_listening_trends TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_listening_clock TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_listening_history TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_available_timeframes TO authenticated;
-- GRANT EXECUTE ON FUNCTION refresh_analytics_views TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON MATERIALIZED VIEW monthly_listening_trends IS
  'Pre-aggregated monthly listening statistics for fast dashboard loading';

COMMENT ON MATERIALIZED VIEW top_artists_all_time IS
  'Pre-aggregated top 100 artists by total listening time';

COMMENT ON MATERIALIZED VIEW top_tracks_all_time IS
  'Pre-aggregated top 100 tracks by total listening time';

COMMENT ON MATERIALIZED VIEW listening_clock_all_time IS
  'Pre-aggregated listening patterns by day of week and hour of day';

COMMENT ON MATERIALIZED VIEW dashboard_summary_all_time IS
  'Pre-aggregated overall statistics for dashboard summary';

COMMENT ON FUNCTION get_dashboard_summary IS
  'Get dashboard summary statistics with optional time window filtering';

COMMENT ON FUNCTION get_top_artists IS
  'Get top artists with pagination and time window filtering';

COMMENT ON FUNCTION get_top_tracks IS
  'Get top tracks with pagination and time window filtering';

COMMENT ON FUNCTION get_listening_trends IS
  'Get monthly listening trends with time window filtering';

COMMENT ON FUNCTION get_listening_clock IS
  'Get listening clock heatmap data with time window filtering';

COMMENT ON FUNCTION get_listening_history IS
  'Get paginated listening history with search and date filtering';

COMMENT ON FUNCTION get_available_timeframes IS
  'Get list of available years and months with listening data';

COMMENT ON FUNCTION refresh_analytics_views IS
  'Refresh all analytics materialized views (call after bulk data import)';
