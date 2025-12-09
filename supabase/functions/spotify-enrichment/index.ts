// Supabase Edge Function: spotify-enrichment
// Automatically enriches unenriched listening data with Spotify metadata
// Can be triggered manually, via cron, or after uploads

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

interface EnrichmentStats {
  total: number
  enriched: number
  failed: number
  skipped: number
}

interface UnenrichedListen {
  id: number
  user_id: string
  artist: string
  track: string
}

interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{ id: string; name: string }>
  album: {
    name: string
    release_date: string
    images: Array<{ url: string }>
  }
  popularity: number
  explicit: boolean
}

interface SpotifyArtist {
  id: string
  name: string
  genres: string[]
  popularity: number
  images: Array<{ url: string }>
}

/**
 * Get Spotify access token for a user
 */
async function getSpotifyToken(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ access_token: string; refresh_token: string } | null> {
  const { data, error } = await supabase
    .from('spotify_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    console.error(`No Spotify token for user ${userId}:`, error)
    return null
  }

  // Check if token needs refresh (expires in less than 5 minutes)
  const expiresAt = new Date(data.expires_at)
  const needsRefresh = expiresAt.getTime() <= Date.now() + 5 * 60 * 1000

  if (needsRefresh) {
    return await refreshSpotifyToken(supabase, userId, data.refresh_token)
  }

  return { access_token: data.access_token, refresh_token: data.refresh_token }
}

/**
 * Refresh Spotify access token
 */
async function refreshSpotifyToken(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string } | null> {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID')
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    console.error('Spotify credentials not configured')
    return null
  }

  const credentials = btoa(`${clientId}:${clientSecret}`)

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    console.error('Failed to refresh token:', await response.text())
    return null
  }

  const data = await response.json()

  // Update token in database
  await supabase
    .from('spotify_tokens')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq('user_id', userId)

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
  }
}

/**
 * Search for a track on Spotify
 */
async function searchTrack(
  accessToken: string,
  artist: string,
  track: string
): Promise<SpotifyTrack | null> {
  const query = `artist:${artist} track:${track}`
  const response = await fetch(
    `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    console.error('Spotify search failed:', await response.text())
    return null
  }

  const data = await response.json()
  return data.tracks?.items[0] || null
}

/**
 * Get artist details from Spotify
 */
async function getArtist(
  accessToken: string,
  artistId: string
): Promise<SpotifyArtist | null> {
  const response = await fetch(`${SPOTIFY_API_BASE}/artists/${artistId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    console.error('Spotify artist fetch failed:', await response.text())
    return null
  }

  return await response.json()
}

/**
 * Enrich a single listen record
 */
async function enrichListen(
  supabase: ReturnType<typeof createClient>,
  listen: UnenrichedListen,
  accessToken: string
): Promise<boolean> {
  try {
    // Search for track
    const track = await searchTrack(accessToken, listen.artist, listen.track)
    if (!track) {
      console.log(`No match for: ${listen.artist} - ${listen.track}`)
      return false
    }

    // Get artist details
    const artistId = track.artists[0]?.id
    if (!artistId) {
      console.log(`No artist ID for track: ${track.name}`)
      return false
    }

    const artist = await getArtist(accessToken, artistId)
    if (!artist) {
      console.log(`No artist details for ID: ${artistId}`)
      return false
    }

    // Update the listen record
    const { error } = await supabase
      .from('listens')
      .update({
        spotify_track_id: track.id,
        spotify_artist_id: artist.id,
        album: track.album.name,
        release_date: track.album.release_date,
        popularity: track.popularity,
        explicit: track.explicit,
        artist_genres: artist.genres,
        artist_popularity: artist.popularity,
        album_image_url: track.album.images[0]?.url || null,
        enriched_at: new Date().toISOString(),
      })
      .eq('id', listen.id)

    if (error) {
      console.error(`Failed to update listen ${listen.id}:`, error)
      return false
    }

    return true
  } catch (error) {
    console.error(`Error enriching listen ${listen.id}:`, error)
    return false
  }
}

/**
 * Process enrichment for specific listen IDs
 */
async function processSpecificListens(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  listenIds: number[],
  batchSize: number = 50
): Promise<EnrichmentStats> {
  const stats: EnrichmentStats = {
    total: listenIds.length,
    enriched: 0,
    failed: 0,
    skipped: 0,
  }

  console.log(`Processing ${listenIds.length} specific listens for user ${userId}`)

  // Get user's Spotify token
  const token = await getSpotifyToken(supabase, userId)
  if (!token) {
    console.log(`Skipping user ${userId}: no valid token`)
    return stats
  }

  // Get the specific listens
  const { data: listens, error: listensError } = await supabase
    .from('listens')
    .select('id, user_id, artist, track')
    .eq('user_id', userId)
    .in('id', listenIds)
    .is('spotify_track_id', null)
    .not('artist', 'is', null)
    .not('track', 'is', null)
    .limit(batchSize)

  if (listensError || !listens || listens.length === 0) {
    console.log(`No valid listens to enrich for user ${userId}`)
    return stats
  }

  console.log(`Enriching ${listens.length} listens`)

  // Process each listen with rate limiting
  for (const listen of listens) {
    const success = await enrichListen(supabase, listen, token.access_token)

    if (success) {
      stats.enriched++
    } else {
      stats.skipped++
    }

    // Rate limiting: ~170 requests/min = ~350ms between requests
    await new Promise(resolve => setTimeout(resolve, 350))
  }

  console.log('Enrichment complete:', stats)
  return stats
}

/**
 * Process enrichment for a batch of users (general enrichment)
 */
async function processEnrichment(
  supabase: ReturnType<typeof createClient>,
  batchSize: number = 50
): Promise<EnrichmentStats> {
  const stats: EnrichmentStats = {
    total: 0,
    enriched: 0,
    failed: 0,
    skipped: 0,
  }

  // Get users who have Spotify tokens
  const { data: users, error: usersError } = await supabase
    .from('spotify_tokens')
    .select('user_id')
    .limit(10) // Process up to 10 users per run

  if (usersError || !users || users.length === 0) {
    console.log('No users with Spotify tokens found')
    return stats
  }

  console.log(`Processing enrichment for ${users.length} users`)

  // Process each user
  for (const user of users) {
    const userId = user.user_id

    // Get user's Spotify token
    const token = await getSpotifyToken(supabase, userId)
    if (!token) {
      console.log(`Skipping user ${userId}: no valid token`)
      continue
    }

    // Get unenriched listens for this user
    const { data: listens, error: listensError } = await supabase
      .from('listens')
      .select('id, user_id, artist, track')
      .eq('user_id', userId)
      .is('spotify_track_id', null)
      .not('artist', 'is', null)
      .not('track', 'is', null)
      .limit(batchSize)

    if (listensError || !listens || listens.length === 0) {
      console.log(`No unenriched listens for user ${userId}`)
      continue
    }

    console.log(`Enriching ${listens.length} listens for user ${userId}`)
    stats.total += listens.length

    // Process each listen with rate limiting
    for (const listen of listens) {
      const success = await enrichListen(supabase, listen, token.access_token)

      if (success) {
        stats.enriched++
      } else {
        stats.skipped++
      }

      // Rate limiting: ~170 requests/min = ~350ms between requests
      await new Promise(resolve => setTimeout(resolve, 350))
    }
  }

  console.log('Enrichment complete:', stats)
  return stats
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const body = await req.json().catch(() => ({}))
    const batchSize = body.batch_size || 50
    const userId = body.user_id
    const listenIds = body.listen_ids

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log('[Spotify Enrichment] Starting enrichment process...')

    let stats: EnrichmentStats

    // Check if this is a specific enrichment (from upload) or general enrichment
    if (userId && listenIds && Array.isArray(listenIds) && listenIds.length > 0) {
      console.log(`[Spotify Enrichment] Processing specific listens for user ${userId}`)
      stats = await processSpecificListens(supabase, userId, listenIds, batchSize)
    } else {
      console.log('[Spotify Enrichment] Processing general enrichment for all users')
      stats = await processEnrichment(supabase, batchSize)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Enrichment completed',
        stats,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )

  } catch (error) {
    console.error('[Spotify Enrichment] Fatal error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
