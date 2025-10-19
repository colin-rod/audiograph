-- Spotify Analytics Migration
-- Adds RPC functions for genre, release year, popularity, and album analytics

-- ============================================================================
-- GENRE ANALYTICS
-- ============================================================================

-- Get top genres by listening time
CREATE OR REPLACE FUNCTION get_top_genres(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL,
  limit_count integer DEFAULT 10
)
RETURNS TABLE (
  genre text,
  total_hours numeric,
  listen_count bigint,
  unique_artists bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    genre_value::text as genre,
    ROUND((SUM(l.ms_played) / 3600000.0)::numeric, 1) as total_hours,
    COUNT(*) as listen_count,
    COUNT(DISTINCT l.artist) as unique_artists
  FROM listens l,
       jsonb_array_elements_text(l.artist_genres) as genre_value
  WHERE
    l.user_id = current_user_id
    AND l.ms_played IS NOT NULL
    AND l.artist_genres IS NOT NULL
    AND jsonb_array_length(l.artist_genres) > 0
    AND (start_date IS NULL OR l.ts >= start_date)
    AND (end_date IS NULL OR l.ts < end_date)
  GROUP BY genre_value
  ORDER BY total_hours DESC
  LIMIT limit_count;
END;
$$;

-- Get genre distribution over time (monthly)
CREATE OR REPLACE FUNCTION get_genre_timeline(
  target_genre text,
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  month timestamptz,
  total_hours numeric,
  listen_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    date_trunc('month', l.ts) as month,
    ROUND((SUM(l.ms_played) / 3600000.0)::numeric, 1) as total_hours,
    COUNT(*) as listen_count
  FROM listens l,
       jsonb_array_elements_text(l.artist_genres) as genre_value
  WHERE
    l.user_id = current_user_id
    AND l.ms_played IS NOT NULL
    AND genre_value = target_genre
    AND (start_date IS NULL OR l.ts >= start_date)
    AND (end_date IS NULL OR l.ts < end_date)
  GROUP BY date_trunc('month', l.ts)
  ORDER BY month;
END;
$$;

-- ============================================================================
-- RELEASE YEAR ANALYTICS
-- ============================================================================

-- Get listening distribution by decade
CREATE OR REPLACE FUNCTION get_listening_by_decade(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  decade text,
  total_hours numeric,
  listen_count bigint,
  percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  total_listening_time numeric;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get total listening time for percentage calculation
  SELECT SUM(ms_played) / 3600000.0
  INTO total_listening_time
  FROM listens
  WHERE
    user_id = current_user_id
    AND ms_played IS NOT NULL
    AND release_date IS NOT NULL
    AND (start_date IS NULL OR ts >= start_date)
    AND (end_date IS NULL OR ts < end_date);

  IF total_listening_time IS NULL OR total_listening_time = 0 THEN
    total_listening_time := 1; -- Avoid division by zero
  END IF;

  RETURN QUERY
  SELECT
    CONCAT(FLOOR(EXTRACT(YEAR FROM release_date) / 10) * 10, 's') as decade,
    ROUND((SUM(ms_played) / 3600000.0)::numeric, 1) as total_hours,
    COUNT(*) as listen_count,
    ROUND((SUM(ms_played) / 3600000.0 / total_listening_time * 100)::numeric, 1) as percentage
  FROM listens
  WHERE
    user_id = current_user_id
    AND ms_played IS NOT NULL
    AND release_date IS NOT NULL
    AND (start_date IS NULL OR ts >= start_date)
    AND (end_date IS NULL OR ts < end_date)
  GROUP BY FLOOR(EXTRACT(YEAR FROM release_date) / 10)
  ORDER BY decade DESC;
END;
$$;

-- Get music discovery score (% of music from current year)
CREATE OR REPLACE FUNCTION get_discovery_score(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  current_year_percentage numeric,
  new_music_hours numeric,
  total_hours numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  current_year integer;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::integer;

  RETURN QUERY
  WITH stats AS (
    SELECT
      SUM(ms_played) FILTER (WHERE EXTRACT(YEAR FROM release_date)::integer = current_year) as new_music_ms,
      SUM(ms_played) as total_ms
    FROM listens
    WHERE
      user_id = current_user_id
      AND ms_played IS NOT NULL
      AND release_date IS NOT NULL
      AND (start_date IS NULL OR ts >= start_date)
      AND (end_date IS NULL OR ts < end_date)
  )
  SELECT
    ROUND((COALESCE(new_music_ms, 0)::numeric / NULLIF(total_ms, 0)::numeric * 100), 1) as current_year_percentage,
    ROUND((COALESCE(new_music_ms, 0) / 3600000.0)::numeric, 1) as new_music_hours,
    ROUND((COALESCE(total_ms, 0) / 3600000.0)::numeric, 1) as total_hours
  FROM stats;
END;
$$;

-- ============================================================================
-- POPULARITY ANALYTICS
-- ============================================================================

-- Get mainstream vs niche score
CREATE OR REPLACE FUNCTION get_mainstream_score(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  avg_track_popularity numeric,
  avg_artist_popularity numeric,
  mainstream_percentage numeric,
  niche_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH weighted_popularity AS (
    SELECT
      popularity,
      artist_popularity,
      ms_played
    FROM listens
    WHERE
      user_id = current_user_id
      AND ms_played IS NOT NULL
      AND popularity IS NOT NULL
      AND artist_popularity IS NOT NULL
      AND (start_date IS NULL OR ts >= start_date)
      AND (end_date IS NULL OR ts < end_date)
  )
  SELECT
    ROUND(AVG(popularity)::numeric, 1) as avg_track_popularity,
    ROUND(AVG(artist_popularity)::numeric, 1) as avg_artist_popularity,
    ROUND((COUNT(*) FILTER (WHERE popularity >= 70)::numeric / NULLIF(COUNT(*), 0)::numeric * 100), 1) as mainstream_percentage,
    ROUND((COUNT(*) FILTER (WHERE popularity < 40)::numeric / NULLIF(COUNT(*), 0)::numeric * 100), 1) as niche_percentage
  FROM weighted_popularity;
END;
$$;

-- ============================================================================
-- ALBUM ANALYTICS
-- ============================================================================

-- Get top albums by listening time
CREATE OR REPLACE FUNCTION get_top_albums(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL,
  limit_count integer DEFAULT 10
)
RETURNS TABLE (
  album text,
  artist text,
  total_hours numeric,
  listen_count bigint,
  album_image_url text,
  release_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    l.album,
    l.artist,
    ROUND((SUM(l.ms_played) / 3600000.0)::numeric, 1) as total_hours,
    COUNT(*) as listen_count,
    MAX(l.album_image_url) as album_image_url,
    MAX(l.release_date) as release_date
  FROM listens l
  WHERE
    l.user_id = current_user_id
    AND l.album IS NOT NULL
    AND l.ms_played IS NOT NULL
    AND (start_date IS NULL OR l.ts >= start_date)
    AND (end_date IS NULL OR l.ts < end_date)
  GROUP BY l.album, l.artist
  ORDER BY total_hours DESC
  LIMIT limit_count;
END;
$$;

-- ============================================================================
-- ENHANCED ARTIST INSIGHTS
-- ============================================================================

-- Get top artists with enhanced metadata
CREATE OR REPLACE FUNCTION get_top_artists_enhanced(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL,
  limit_count integer DEFAULT 10
)
RETURNS TABLE (
  artist text,
  total_hours numeric,
  listen_count bigint,
  artist_genres jsonb,
  artist_popularity integer,
  unique_tracks bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    l.artist,
    ROUND((SUM(l.ms_played) / 3600000.0)::numeric, 1) as total_hours,
    COUNT(*) as listen_count,
    MAX(l.artist_genres) as artist_genres,
    MAX(l.artist_popularity) as artist_popularity,
    COUNT(DISTINCT l.track) as unique_tracks
  FROM listens l
  WHERE
    l.user_id = current_user_id
    AND l.artist IS NOT NULL
    AND l.ms_played IS NOT NULL
    AND (start_date IS NULL OR l.ts >= start_date)
    AND (end_date IS NULL OR l.ts < end_date)
  GROUP BY l.artist
  ORDER BY total_hours DESC
  LIMIT limit_count;
END;
$$;

-- ============================================================================
-- ENRICHMENT PROGRESS TRACKING
-- ============================================================================

-- Get enrichment progress for current user
CREATE OR REPLACE FUNCTION get_enrichment_progress()
RETURNS TABLE (
  total_listens bigint,
  enriched_listens bigint,
  percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) as total_listens,
    COUNT(*) FILTER (WHERE spotify_track_id IS NOT NULL) as enriched_listens,
    ROUND(
      (COUNT(*) FILTER (WHERE spotify_track_id IS NOT NULL)::numeric /
       NULLIF(COUNT(*), 0)::numeric * 100),
      1
    ) as percentage
  FROM listens
  WHERE user_id = current_user_id;
END;
$$;
