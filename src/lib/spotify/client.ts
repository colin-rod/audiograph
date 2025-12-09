/**
 * Spotify Web API Client
 *
 * Handles authenticated requests to Spotify's Web API with automatic token refresh.
 * Rate limit: ~180 requests per minute (be conservative)
 */

import { supabase } from '@/lib/supabaseClient'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

/**
 * Spotify track object (simplified)
 */
export type SpotifyTrack = {
  id: string
  name: string
  artists: Array<{
    id: string
    name: string
  }>
  album: {
    name: string
    release_date: string
    images: Array<{
      url: string
      height: number
      width: number
    }>
  }
  popularity: number
  explicit: boolean
}

/**
 * Spotify artist object (simplified)
 */
export type SpotifyArtist = {
  id: string
  name: string
  genres: string[]
  popularity: number
  images: Array<{
    url: string
    height: number
    width: number
  }>
}

/**
 * Search result for track
 */
export type SpotifySearchResult = {
  tracks: {
    items: SpotifyTrack[]
  }
}

/**
 * Token refresh response
 */
type TokenRefreshResponse = {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
}

/**
 * Error thrown when Spotify API request fails
 */
export class SpotifyAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown
  ) {
    super(message)
    this.name = 'SpotifyAPIError'
  }
}

/**
 * Get user's Spotify access token from database
 * Automatically refreshes if expired
 */
async function getAccessToken(): Promise<string> {
  // Get token from database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tokenData, error: tokenError } = await (supabase.rpc as any)(
    'get_user_spotify_token'
  ).single()

  if (tokenError) {
    throw new SpotifyAPIError('Failed to retrieve Spotify token', undefined, tokenError)
  }

  if (!tokenData) {
    throw new SpotifyAPIError('No Spotify token found. Please connect your Spotify account.')
  }

  // Check if token needs refresh
  if (tokenData.needs_refresh) {
    const newToken = await refreshAccessToken(tokenData.refresh_token)
    return newToken
  }

  return tokenData.access_token
}

/**
 * Refresh Spotify access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new SpotifyAPIError('Spotify client credentials not configured')
  }

  // Use btoa for browser compatibility, Buffer for Node.js
  const credentials = typeof window === 'undefined'
    ? Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    : btoa(`${clientId}:${clientSecret}`)

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
    const errorData = await response.json().catch(() => ({}))
    throw new SpotifyAPIError(
      'Failed to refresh Spotify token',
      response.status,
      errorData
    )
  }

  const data: TokenRefreshResponse = await response.json()

  // Update token in database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.rpc as any)('upsert_spotify_token', {
    new_access_token: data.access_token,
    new_refresh_token: data.refresh_token || refreshToken,
    expires_in_seconds: data.expires_in,
  })

  if (updateError) {
    throw new SpotifyAPIError('Failed to save refreshed token', undefined, updateError)
  }

  return data.access_token
}

/**
 * Make an authenticated request to Spotify API
 */
async function spotifyRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getAccessToken()

  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new SpotifyAPIError(
      `Spotify API error: ${response.statusText}`,
      response.status,
      errorData
    )
  }

  return response.json()
}

/**
 * Search for a track by artist and track name
 * Returns the first match
 */
export async function searchTrack(
  artist: string,
  track: string
): Promise<SpotifyTrack | null> {
  try {
    const query = `artist:${artist} track:${track}`
    const result = await spotifyRequest<SpotifySearchResult>(
      `/search?q=${encodeURIComponent(query)}&type=track&limit=1`
    )

    return result.tracks.items[0] || null
  } catch (error) {
    console.error('Failed to search track:', error)
    throw error
  }
}

/**
 * Get track details by Spotify ID
 */
export async function getTrack(trackId: string): Promise<SpotifyTrack> {
  return spotifyRequest<SpotifyTrack>(`/tracks/${trackId}`)
}

/**
 * Get multiple tracks by Spotify IDs (batch request)
 * Maximum 50 IDs per request
 */
export async function getTracks(trackIds: string[]): Promise<SpotifyTrack[]> {
  if (trackIds.length === 0) return []
  if (trackIds.length > 50) {
    throw new Error('Cannot fetch more than 50 tracks at once')
  }

  const result = await spotifyRequest<{ tracks: SpotifyTrack[] }>(
    `/tracks?ids=${trackIds.join(',')}`
  )

  return result.tracks
}

/**
 * Get artist details by Spotify ID
 */
export async function getArtist(artistId: string): Promise<SpotifyArtist> {
  return spotifyRequest<SpotifyArtist>(`/artists/${artistId}`)
}

/**
 * Get multiple artists by Spotify IDs (batch request)
 * Maximum 50 IDs per request
 */
export async function getArtists(artistIds: string[]): Promise<SpotifyArtist[]> {
  if (artistIds.length === 0) return []
  if (artistIds.length > 50) {
    throw new Error('Cannot fetch more than 50 artists at once')
  }

  const result = await spotifyRequest<{ artists: SpotifyArtist[] }>(
    `/artists?ids=${artistIds.join(',')}`
  )

  return result.artists
}

/**
 * Get user's recently played tracks
 * Maximum 50 tracks
 */
export async function getRecentlyPlayed(limit: number = 50): Promise<Array<{
  track: SpotifyTrack
  played_at: string
}>> {
  if (limit > 50) {
    throw new Error('Cannot fetch more than 50 recently played tracks at once')
  }

  const result = await spotifyRequest<{
    items: Array<{
      track: SpotifyTrack
      played_at: string
    }>
  }>(`/me/player/recently-played?limit=${limit}`)

  return result.items
}

/**
 * Batch process with rate limiting
 * Processes items in chunks with delays between batches
 */
export async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>,
  delayMs: number = 350 // ~170 requests/min to stay under 180/min limit
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await processor(batch)
    results.push(...batchResults)

    // Add delay between batches (except for the last batch)
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return results
}
