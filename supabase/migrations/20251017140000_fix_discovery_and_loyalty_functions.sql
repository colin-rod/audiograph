-- Fix Discovery Tracker and Loyalty Gauge RPC functions
-- Resolves ambiguous column reference issues

-- Drop existing functions
DROP FUNCTION IF EXISTS get_discovery_tracker(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS get_loyalty_gauge(timestamptz, timestamptz);

-- Discovery tracker: Count first-time listens per month
CREATE OR REPLACE FUNCTION get_discovery_tracker(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  month text,
  new_artists bigint,
  new_tracks bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
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
  WITH first_artist_listens AS (
    SELECT
      l.artist,
      MIN(l.ts) AS first_listen_ts
    FROM listens l
    WHERE
      l.user_id = current_user_id
      AND l.artist IS NOT NULL
      AND l.ts IS NOT NULL
    GROUP BY l.artist
  ),
  first_track_listens AS (
    SELECT
      l.track,
      l.artist,
      MIN(l.ts) AS first_listen_ts
    FROM listens l
    WHERE
      l.user_id = current_user_id
      AND l.track IS NOT NULL
      AND l.ts IS NOT NULL
    GROUP BY l.track, l.artist
  ),
  artist_discoveries AS (
    SELECT
      TO_CHAR(fal.first_listen_ts, 'YYYY-MM') AS discovery_month,
      COUNT(*) AS new_artists
    FROM first_artist_listens fal
    WHERE
      (start_date IS NULL OR fal.first_listen_ts >= start_date)
      AND (end_date IS NULL OR fal.first_listen_ts < end_date)
    GROUP BY TO_CHAR(fal.first_listen_ts, 'YYYY-MM')
  ),
  track_discoveries AS (
    SELECT
      TO_CHAR(ftl.first_listen_ts, 'YYYY-MM') AS discovery_month,
      COUNT(*) AS new_tracks
    FROM first_track_listens ftl
    WHERE
      (start_date IS NULL OR ftl.first_listen_ts >= start_date)
      AND (end_date IS NULL OR ftl.first_listen_ts < end_date)
    GROUP BY TO_CHAR(ftl.first_listen_ts, 'YYYY-MM')
  ),
  all_months AS (
    SELECT DISTINCT discovery_month FROM artist_discoveries
    UNION
    SELECT DISTINCT discovery_month FROM track_discoveries
  )
  SELECT
    am.discovery_month AS month,
    COALESCE(ad.new_artists, 0) AS new_artists,
    COALESCE(td.new_tracks, 0) AS new_tracks
  FROM all_months am
  LEFT JOIN artist_discoveries ad ON am.discovery_month = ad.discovery_month
  LEFT JOIN track_discoveries td ON am.discovery_month = td.discovery_month
  ORDER BY am.discovery_month ASC;
END;
$$;

COMMENT ON FUNCTION get_discovery_tracker IS
  'Track first-time artist and track discoveries per month with time window filtering';

-- Loyalty gauge: Measure repeat listens
CREATE OR REPLACE FUNCTION get_loyalty_gauge(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  month text,
  repeat_listen_share numeric,
  repeat_listen_count bigint,
  total_listen_count bigint,
  threshold int,
  top_tracks jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  current_user_id uuid;
  repeat_threshold int := 5;
BEGIN
  -- Get the current authenticated user's ID
  current_user_id := auth.uid();

  -- If no user is authenticated, return empty result
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH filtered_listens AS (
    SELECT
      l.track,
      l.artist,
      l.ts,
      TO_CHAR(l.ts, 'YYYY-MM') AS listen_month
    FROM listens l
    WHERE
      l.user_id = current_user_id
      AND l.track IS NOT NULL
      AND l.ts IS NOT NULL
      AND (start_date IS NULL OR l.ts >= start_date)
      AND (end_date IS NULL OR l.ts < end_date)
  ),
  track_counts AS (
    SELECT
      fl.track,
      fl.artist,
      COUNT(*) AS play_count
    FROM filtered_listens fl
    GROUP BY fl.track, fl.artist
  ),
  repeat_tracks AS (
    SELECT tc.track, tc.artist, tc.play_count
    FROM track_counts tc
    WHERE tc.play_count >= repeat_threshold
  ),
  monthly_stats AS (
    SELECT
      fl.listen_month,
      COUNT(*) AS total_listens,
      COUNT(*) FILTER (WHERE rt.track IS NOT NULL) AS repeat_listens
    FROM filtered_listens fl
    LEFT JOIN repeat_tracks rt ON fl.track = rt.track AND fl.artist = rt.artist
    GROUP BY fl.listen_month
  ),
  top_repeat_tracks AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'track', rt.track,
        'artist', rt.artist,
        'playCount', rt.play_count
      )
      ORDER BY rt.play_count DESC
    ) AS tracks
    FROM (
      SELECT rt2.track, rt2.artist, rt2.play_count
      FROM repeat_tracks rt2
      ORDER BY rt2.play_count DESC
      LIMIT 5
    ) rt
  )
  SELECT
    ms.listen_month AS month,
    CASE
      WHEN ms.total_listens > 0
      THEN ROUND((ms.repeat_listens::numeric / ms.total_listens::numeric), 4)
      ELSE 0
    END AS repeat_listen_share,
    ms.repeat_listens AS repeat_listen_count,
    ms.total_listens AS total_listen_count,
    repeat_threshold AS threshold,
    COALESCE(trt.tracks, '[]'::jsonb) AS top_tracks
  FROM monthly_stats ms
  CROSS JOIN top_repeat_tracks trt
  ORDER BY ms.listen_month ASC;
END;
$$;

COMMENT ON FUNCTION get_loyalty_gauge IS
  'Measure repeat listen patterns and identify most replayed tracks with time window filtering';
