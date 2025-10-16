-- Fix all RPC functions to work with RLS and user_id filtering
-- This migration updates all analytics functions to properly filter by user_id

-- ============================================================================
-- 1. Fix get_dashboard_summary
-- ============================================================================

DROP FUNCTION IF EXISTS get_dashboard_summary(timestamptz, timestamptz);

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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the current authenticated user's ID
  current_user_id := auth.uid();

  -- If no user is authenticated, return empty result
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH filtered_data AS (
    SELECT
      ms_played,
      artist,
      track,
      ts
    FROM listens
    WHERE
      user_id = current_user_id
      AND ms_played IS NOT NULL
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
  CROSS JOIN LATERAL (SELECT COALESCE((SELECT artist FROM top_artist_data), NULL) as artist) ta
  CROSS JOIN LATERAL (SELECT COALESCE((SELECT year FROM most_active_year_data), NULL) as year) my;
END;
$$;

-- ============================================================================
-- 2. Fix get_top_artists
-- ============================================================================

DROP FUNCTION IF EXISTS get_top_artists(timestamptz, timestamptz, int, int);

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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    l.artist,
    ROUND((SUM(l.ms_played) / 3600000.0)::numeric, 1) as total_hours,
    COUNT(*) as listen_count
  FROM listens l
  WHERE
    l.user_id = current_user_id
    AND l.artist IS NOT NULL
    AND l.ms_played IS NOT NULL
    AND (start_date IS NULL OR l.ts >= start_date)
    AND (end_date IS NULL OR l.ts < end_date)
  GROUP BY l.artist
  ORDER BY SUM(l.ms_played) DESC, l.artist ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- ============================================================================
-- 3. Fix get_top_tracks
-- ============================================================================

DROP FUNCTION IF EXISTS get_top_tracks(timestamptz, timestamptz, int, int);

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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    l.track,
    l.artist,
    ROUND((SUM(l.ms_played) / 3600000.0)::numeric, 1) as total_hours,
    COUNT(*) as listen_count
  FROM listens l
  WHERE
    l.user_id = current_user_id
    AND l.track IS NOT NULL
    AND l.ms_played IS NOT NULL
    AND (start_date IS NULL OR l.ts >= start_date)
    AND (end_date IS NULL OR l.ts < end_date)
  GROUP BY l.track, l.artist
  ORDER BY SUM(l.ms_played) DESC, l.track ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- ============================================================================
-- 4. Fix get_listening_trends
-- ============================================================================

DROP FUNCTION IF EXISTS get_listening_trends(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION get_listening_trends(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  month timestamptz,
  total_hours numeric,
  listen_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    date_trunc('month', l.ts) as month,
    ROUND((SUM(l.ms_played) / 3600000.0)::numeric, 1) as total_hours,
    COUNT(*) as listen_count
  FROM listens l
  WHERE
    l.user_id = current_user_id
    AND l.ts IS NOT NULL
    AND l.ms_played IS NOT NULL
    AND (start_date IS NULL OR l.ts >= start_date)
    AND (end_date IS NULL OR l.ts < end_date)
  GROUP BY date_trunc('month', l.ts)
  ORDER BY month ASC;
END;
$$;

-- ============================================================================
-- 5. Fix get_listening_clock
-- ============================================================================

DROP FUNCTION IF EXISTS get_listening_clock(timestamptz, timestamptz);

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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    EXTRACT(DOW FROM l.ts)::int as day_of_week,
    EXTRACT(HOUR FROM l.ts)::int as hour_of_day,
    ROUND((SUM(l.ms_played) / 3600000.0)::numeric, 1) as total_hours,
    COUNT(*) as listen_count
  FROM listens l
  WHERE
    l.user_id = current_user_id
    AND l.ts IS NOT NULL
    AND l.ms_played IS NOT NULL
    AND (start_date IS NULL OR l.ts >= start_date)
    AND (end_date IS NULL OR l.ts < end_date)
  GROUP BY day_of_week, hour_of_day
  ORDER BY day_of_week, hour_of_day;
END;
$$;

-- ============================================================================
-- 6. Fix get_listening_history
-- ============================================================================

DROP FUNCTION IF EXISTS get_listening_history(text, timestamptz, timestamptz, int, int);

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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count_val bigint;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    total_count_val := 0;
    RETURN;
  END IF;

  -- Get total count for pagination
  SELECT COUNT(*) INTO total_count_val
  FROM listens
  WHERE
    user_id = current_user_id
    AND (search_query IS NULL OR
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
    l.user_id = current_user_id
    AND (search_query IS NULL OR
         l.track ILIKE '%' || search_query || '%' OR
         l.artist ILIKE '%' || search_query || '%')
    AND (start_date IS NULL OR l.ts >= start_date)
    AND (end_date IS NULL OR l.ts < end_date)
  ORDER BY l.ts DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- ============================================================================
-- 7. Fix get_available_timeframes
-- ============================================================================

DROP FUNCTION IF EXISTS get_available_timeframes();

CREATE OR REPLACE FUNCTION get_available_timeframes()
RETURNS TABLE (
  year int,
  month int,
  listen_count bigint,
  total_hours numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    EXTRACT(YEAR FROM l.ts)::int as year,
    EXTRACT(MONTH FROM l.ts)::int as month,
    COUNT(*) as listen_count,
    ROUND((SUM(l.ms_played) / 3600000.0)::numeric, 1) as total_hours
  FROM listens l
  WHERE l.user_id = current_user_id
    AND l.ts IS NOT NULL
    AND l.ms_played IS NOT NULL
  GROUP BY year, month
  ORDER BY year DESC, month DESC;
END;
$$;

-- ============================================================================
-- Update comments for documentation
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_dashboard_summary(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_artists(timestamptz, timestamptz, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_tracks(timestamptz, timestamptz, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listening_trends(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listening_clock(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listening_history(text, timestamptz, timestamptz, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_timeframes() TO authenticated;

COMMENT ON FUNCTION get_dashboard_summary IS
  'Get dashboard summary statistics with optional time window filtering (user-scoped with RLS)';

COMMENT ON FUNCTION get_top_artists IS
  'Get top artists with pagination and time window filtering (user-scoped with RLS)';

COMMENT ON FUNCTION get_top_tracks IS
  'Get top tracks with pagination and time window filtering (user-scoped with RLS)';

COMMENT ON FUNCTION get_listening_trends IS
  'Get monthly listening trends with time window filtering (user-scoped with RLS)';

COMMENT ON FUNCTION get_listening_clock IS
  'Get listening clock heatmap data with time window filtering (user-scoped with RLS)';

COMMENT ON FUNCTION get_listening_history IS
  'Get paginated listening history with search and date filtering (user-scoped with RLS)';

COMMENT ON FUNCTION get_available_timeframes IS
  'Get list of available years and months with listening data (user-scoped with RLS)';
