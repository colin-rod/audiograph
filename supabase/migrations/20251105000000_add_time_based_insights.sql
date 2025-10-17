-- Time-based insights support: weekly trends & listening streaks

-- Drop existing functions if they exist to allow recreation
DROP FUNCTION IF EXISTS get_weekly_listening_trends(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS get_listening_streaks(timestamptz, timestamptz);

-- Weekly listening trends grouped by ISO week
CREATE OR REPLACE FUNCTION get_weekly_listening_trends(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  week_start timestamptz,
  week_end timestamptz,
  week_number int,
  year int,
  total_hours numeric,
  listen_count bigint
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
  SELECT
    date_trunc('week', l.ts) AS week_start,
    date_trunc('week', l.ts) + INTERVAL '6 days' AS week_end,
    EXTRACT(week FROM l.ts)::int AS week_number,
    EXTRACT(year FROM l.ts)::int AS year,
    ROUND((SUM(l.ms_played) / 3600000.0)::numeric, 1) AS total_hours,
    COUNT(*) AS listen_count
  FROM listens l
  WHERE
    l.user_id = current_user_id
    AND l.ts IS NOT NULL
    AND l.ms_played IS NOT NULL
    AND (start_date IS NULL OR l.ts >= start_date)
    AND (end_date IS NULL OR l.ts < end_date)
  GROUP BY week_start, week_number, year
  ORDER BY week_start ASC;
END;
$$;

COMMENT ON FUNCTION get_weekly_listening_trends IS
  'Get weekly listening trends with time window filtering';

-- Listening streak statistics (longest and current streak)
CREATE OR REPLACE FUNCTION get_listening_streaks(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  longest_streak int,
  longest_streak_start date,
  longest_streak_end date,
  current_streak int,
  current_streak_start date,
  current_streak_end date
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
  WITH distinct_days AS (
    SELECT DISTINCT (l.ts AT TIME ZONE 'UTC')::date AS listen_day
    FROM listens l
    WHERE
      l.user_id = current_user_id
      AND l.ts IS NOT NULL
      AND l.ms_played IS NOT NULL
      AND (start_date IS NULL OR l.ts >= start_date)
      AND (end_date IS NULL OR l.ts < end_date)
  ),
  ordered_days AS (
    SELECT
      listen_day,
      ROW_NUMBER() OVER (ORDER BY listen_day) AS rn
    FROM distinct_days
  ),
  streak_groups AS (
    SELECT
      listen_day,
      rn,
      (listen_day - (rn || ' days')::interval)::date AS group_key
    FROM ordered_days
  ),
  streak_spans AS (
    SELECT
      MIN(listen_day) AS streak_start,
      MAX(listen_day) AS streak_end,
      COUNT(*)::int AS streak_length
    FROM streak_groups
    GROUP BY group_key
  ),
  longest AS (
    SELECT
      streak_length,
      streak_start,
      streak_end
    FROM streak_spans
    ORDER BY streak_length DESC, streak_end DESC
    LIMIT 1
  ),
  latest_day AS (
    SELECT MAX(listen_day) AS listen_day FROM distinct_days
  ),
  current AS (
    SELECT
      s.streak_length,
      s.streak_start,
      s.streak_end
    FROM streak_spans s
    JOIN latest_day ld ON ld.listen_day IS NOT NULL AND s.streak_end = ld.listen_day
    LIMIT 1
  )
  SELECT
    COALESCE(longest.streak_length, 0)::int AS longest_streak,
    longest.streak_start,
    longest.streak_end,
    COALESCE(current.streak_length, 0)::int AS current_streak,
    current.streak_start,
    current.streak_end
  FROM (SELECT 1) AS base
  LEFT JOIN longest ON TRUE
  LEFT JOIN current ON TRUE;
END;
$$;

COMMENT ON FUNCTION get_listening_streaks IS
  'Get longest and current listening streaks with time window filtering';
