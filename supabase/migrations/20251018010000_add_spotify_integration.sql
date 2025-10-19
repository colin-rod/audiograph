-- Spotify Integration Migration
-- Adds support for storing Spotify OAuth tokens and enriching listening data with Spotify metadata

-- ============================================================================
-- SPOTIFY TOKENS TABLE
-- ============================================================================

-- Store Spotify OAuth tokens for authenticated users
CREATE TABLE IF NOT EXISTS spotify_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure one token record per user
  CONSTRAINT unique_user_spotify_token UNIQUE (user_id)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_spotify_tokens_user_id ON spotify_tokens(user_id);

-- Index for finding expired tokens
CREATE INDEX IF NOT EXISTS idx_spotify_tokens_expires_at ON spotify_tokens(expires_at);

-- ============================================================================
-- ROW LEVEL SECURITY FOR SPOTIFY TOKENS
-- ============================================================================

ALTER TABLE spotify_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY "Users can view their own Spotify tokens"
  ON spotify_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Spotify tokens"
  ON spotify_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Spotify tokens"
  ON spotify_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Spotify tokens"
  ON spotify_tokens
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- EXTEND LISTENS TABLE WITH SPOTIFY METADATA
-- ============================================================================

-- Add Spotify metadata columns to existing listens table
ALTER TABLE listens
  ADD COLUMN IF NOT EXISTS spotify_track_id text,
  ADD COLUMN IF NOT EXISTS spotify_artist_id text,
  ADD COLUMN IF NOT EXISTS album text,
  ADD COLUMN IF NOT EXISTS release_date date,
  ADD COLUMN IF NOT EXISTS popularity integer,
  ADD COLUMN IF NOT EXISTS explicit boolean,
  ADD COLUMN IF NOT EXISTS artist_genres jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS artist_popularity integer,
  ADD COLUMN IF NOT EXISTS album_image_url text,
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

-- Add comment to explain jsonb structure
COMMENT ON COLUMN listens.artist_genres IS 'Array of genre strings from Spotify artist data, e.g. ["pop", "indie rock"]';

-- ============================================================================
-- INDEXES FOR SPOTIFY METADATA
-- ============================================================================

-- Indexes for Spotify IDs (for lookups and avoiding duplicate enrichment)
CREATE INDEX IF NOT EXISTS idx_listens_spotify_track_id
  ON listens(spotify_track_id)
  WHERE spotify_track_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listens_spotify_artist_id
  ON listens(spotify_artist_id)
  WHERE spotify_artist_id IS NOT NULL;

-- Index for unenriched records (to efficiently find records needing enrichment)
CREATE INDEX IF NOT EXISTS idx_listens_needs_enrichment
  ON listens(id)
  WHERE spotify_track_id IS NULL AND artist IS NOT NULL AND track IS NOT NULL;

-- Index for genre queries (GIN index for JSONB array operations)
CREATE INDEX IF NOT EXISTS idx_listens_artist_genres
  ON listens USING gin(artist_genres);

-- Index for popularity-based queries
CREATE INDEX IF NOT EXISTS idx_listens_popularity
  ON listens(popularity)
  WHERE popularity IS NOT NULL;

-- Index for release date queries
CREATE INDEX IF NOT EXISTS idx_listens_release_date
  ON listens(release_date)
  WHERE release_date IS NOT NULL;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update spotify_tokens updated_at timestamp
CREATE OR REPLACE FUNCTION update_spotify_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on spotify_tokens
CREATE TRIGGER spotify_tokens_updated_at_trigger
  BEFORE UPDATE ON spotify_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_spotify_tokens_updated_at();

-- ============================================================================
-- RPC FUNCTION: Get or Create Spotify Token
-- ============================================================================

-- Retrieve a user's Spotify token, checking if it needs refresh
CREATE OR REPLACE FUNCTION get_user_spotify_token()
RETURNS TABLE (
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  needs_refresh boolean
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
    st.access_token,
    st.refresh_token,
    st.expires_at,
    (st.expires_at <= now() + interval '5 minutes') as needs_refresh
  FROM spotify_tokens st
  WHERE st.user_id = current_user_id;
END;
$$;

-- ============================================================================
-- RPC FUNCTION: Upsert Spotify Token
-- ============================================================================

-- Insert or update a user's Spotify token
CREATE OR REPLACE FUNCTION upsert_spotify_token(
  new_access_token text,
  new_refresh_token text,
  expires_in_seconds integer
)
RETURNS void
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

  INSERT INTO spotify_tokens (
    user_id,
    access_token,
    refresh_token,
    expires_at
  )
  VALUES (
    current_user_id,
    new_access_token,
    new_refresh_token,
    now() + (expires_in_seconds || ' seconds')::interval
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();
END;
$$;
