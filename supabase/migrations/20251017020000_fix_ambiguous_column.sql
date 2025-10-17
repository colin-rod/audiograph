-- Fix ambiguous column reference in get_listening_history
-- The COUNT query was missing table alias causing "column reference 'track' is ambiguous" error

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
SECURITY INVOKER
AS $$
DECLARE
  total_count_val bigint;
  current_user_id uuid;
  row_count int;
BEGIN
  -- Get the current authenticated user's ID
  current_user_id := auth.uid();

  -- Log authentication status
  RAISE LOG 'get_listening_history called - user_id: %, search_query: %, start_date: %, end_date: %, limit: %, offset: %',
    COALESCE(current_user_id::text, 'NULL'),
    COALESCE(search_query, 'NULL'),
    COALESCE(start_date::text, 'NULL'),
    COALESCE(end_date::text, 'NULL'),
    limit_count,
    offset_count;

  -- If no user is authenticated, raise a more informative error
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: No authenticated user found. Please ensure you are logged in.'
      USING HINT = 'Check that your authentication token is valid and included in the request',
            ERRCODE = 'AUTH1';
  END IF;

  -- Get total count for pagination (FIXED: added table alias 'l')
  SELECT COUNT(*) INTO total_count_val
  FROM listens l
  WHERE
    l.user_id = current_user_id
    AND (search_query IS NULL OR
         l.track ILIKE '%' || search_query || '%' OR
         l.artist ILIKE '%' || search_query || '%')
    AND (start_date IS NULL OR l.ts >= start_date)
    AND (end_date IS NULL OR l.ts < end_date);

  RAISE LOG 'get_listening_history - total_count: % for user_id: %', total_count_val, current_user_id;

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

  GET DIAGNOSTICS row_count = ROW_COUNT;
  RAISE LOG 'get_listening_history - returned % rows', row_count;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'get_listening_history ERROR - SQLSTATE: %, Message: %', SQLSTATE, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION get_listening_history IS
  'Get paginated listening history with search and date filtering (user-scoped with RLS). Includes detailed logging for debugging.';
