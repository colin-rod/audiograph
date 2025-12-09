-- Add Discovery Tracker and Loyalty Gauge RPC functions
-- These functions support Artist & Track Deep Dives features

-- Drop existing functions if they exist to allow recreation
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
      artist,
      MIN(ts) AS first_listen_ts
    FROM listens
    WHERE
      user_id = current_user_id
      AND artist IS NOT NULL
      AND ts IS NOT NULL
    GROUP BY artist
  ),
  first_track_listens AS (
    SELECT
      track,
      artist,
      MIN(ts) AS first_listen_ts
    FROM listens
    WHERE
      user_id = current_user_id
      AND track IS NOT NULL
      AND ts IS NOT NULL
    GROUP BY track, artist
  ),
  artist_discoveries AS (
    SELECT
      TO_CHAR(first_listen_ts, 'YYYY-MM') AS month,
      COUNT(*) AS new_artists
    FROM first_artist_listens
    WHERE
      (start_date IS NULL OR first_listen_ts >= start_date)
      AND (end_date IS NULL OR first_listen_ts < end_date)
    GROUP BY TO_CHAR(first_listen_ts, 'YYYY-MM')
  ),
  track_discoveries AS (
    SELECT
      TO_CHAR(first_listen_ts, 'YYYY-MM') AS month,
      COUNT(*) AS new_tracks
    FROM first_track_listens
    WHERE
      (start_date IS NULL OR first_listen_ts >= start_date)
      AND (end_date IS NULL OR first_listen_ts < end_date)
    GROUP BY TO_CHAR(first_listen_ts, 'YYYY-MM')
  ),
  all_months AS (
    SELECT DISTINCT month FROM artist_discoveries
    UNION
    SELECT DISTINCT month FROM track_discoveries
  )
  SELECT
    am.month,
    COALESCE(ad.new_artists, 0) AS new_artists,
    COALESCE(td.new_tracks, 0) AS new_tracks
  FROM all_months am
  LEFT JOIN artist_discoveries ad ON am.month = ad.month
  LEFT JOIN track_discoveries td ON am.month = td.month
  ORDER BY am.month ASC;
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
      TO_CHAR(l.ts, 'YYYY-MM') AS month
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
      track,
      artist,
      COUNT(*) AS play_count
    FROM filtered_listens
    GROUP BY track, artist
  ),
  repeat_tracks AS (
    SELECT track, artist, play_count
    FROM track_counts
    WHERE play_count >= repeat_threshold
  ),
  monthly_stats AS (
    SELECT
      fl.month,
      COUNT(*) AS total_listens,
      COUNT(*) FILTER (WHERE rt.track IS NOT NULL) AS repeat_listens
    FROM filtered_listens fl
    LEFT JOIN repeat_tracks rt ON fl.track = rt.track AND fl.artist = rt.artist
    GROUP BY fl.month
  ),
  top_repeat_tracks AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'track', track,
        'artist', artist,
        'playCount', play_count
      )
      ORDER BY play_count DESC
    ) AS tracks
    FROM (
      SELECT track, artist, play_count
      FROM repeat_tracks
      ORDER BY play_count DESC
      LIMIT 5
    ) t
  )
  SELECT
    ms.month,
    CASE
      WHEN ms.total_listens > 0
      THEN ROUND((ms.repeat_listens::numeric / ms.total_listens::numeric), 4)
      ELSE 0
    END AS repeat_listen_share,
    ms.repeat_listens,
    ms.total_listens,
    repeat_threshold AS threshold,
    COALESCE(trt.tracks, '[]'::jsonb) AS top_tracks
  FROM monthly_stats ms
  CROSS JOIN top_repeat_tracks trt
  ORDER BY ms.month ASC;
END;
$$;

COMMENT ON FUNCTION get_loyalty_gauge IS
  'Measure repeat listen patterns and identify most replayed tracks with time window filtering';
