/**
 * Spotify Enrichment Service
 *
 * Enriches listening data with Spotify metadata including:
 * - Genres (from artist data)
 * - Album information
 * - Release dates
 * - Popularity scores
 * - Album artwork
 */

import { supabase } from '@/lib/supabaseClient'
import {
  searchTrack,
  getArtists,
  batchProcess,
  SpotifyAPIError,
  type SpotifyTrack,
  type SpotifyArtist,
} from './client'

/**
 * Record that needs enrichment
 */
type UnenrichedListen = {
  id: number
  artist: string
  track: string
}

/**
 * Enrichment result for a single listen
 */
type EnrichmentData = {
  spotify_track_id: string
  spotify_artist_id: string
  album: string
  release_date: string
  popularity: number
  explicit: boolean
  artist_genres: string[]
  artist_popularity: number
  album_image_url: string | null
}

/**
 * Enrichment statistics
 */
export type EnrichmentStats = {
  total: number
  enriched: number
  failed: number
  skipped: number
}

/**
 * Get unenriched listens that need Spotify metadata
 */
async function getUnenrichedListens(limit: number = 100): Promise<UnenrichedListen[]> {
  const { data, error } = await supabase
    .from('listens')
    .select('id, artist, track')
    .is('spotify_track_id', null)
    .not('artist', 'is', null)
    .not('track', 'is', null)
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch unenriched listens: ${error.message}`)
  }

  return data || []
}

/**
 * Extract enrichment data from Spotify track and artist
 */
function extractEnrichmentData(
  track: SpotifyTrack,
  artist: SpotifyArtist
): EnrichmentData {
  // Get largest album image (usually first)
  const albumImage = track.album.images[0]?.url || null

  return {
    spotify_track_id: track.id,
    spotify_artist_id: artist.id,
    album: track.album.name,
    release_date: track.album.release_date,
    popularity: track.popularity,
    explicit: track.explicit,
    artist_genres: artist.genres,
    artist_popularity: artist.popularity,
    album_image_url: albumImage,
  }
}

/**
 * Enrich a single listen record with Spotify metadata
 */
async function enrichSingleListen(
  listen: UnenrichedListen
): Promise<{ id: number; data: EnrichmentData } | null> {
  try {
    // Search for the track on Spotify
    const track = await searchTrack(listen.artist, listen.track)

    if (!track) {
      console.log(`No Spotify match found for: ${listen.artist} - ${listen.track}`)
      return null
    }

    // Get artist details for genres
    const artistId = track.artists[0]?.id
    if (!artistId) {
      console.log(`No artist ID found for track: ${track.name}`)
      return null
    }

    const artists = await getArtists([artistId])
    const artist = artists[0]

    if (!artist) {
      console.log(`No artist details found for ID: ${artistId}`)
      return null
    }

    // Extract enrichment data
    const enrichmentData = extractEnrichmentData(track, artist)

    return {
      id: listen.id,
      data: enrichmentData,
    }
  } catch (error) {
    if (error instanceof SpotifyAPIError) {
      console.error(`Spotify API error enriching listen ${listen.id}:`, error.message)
    } else {
      console.error(`Error enriching listen ${listen.id}:`, error)
    }
    return null
  }
}

/**
 * Update a listen record with enrichment data
 */
async function updateListenWithEnrichment(
  listenId: number,
  enrichmentData: EnrichmentData
): Promise<boolean> {
  const { error } = await supabase
    .from('listens')
    .update({
      ...enrichmentData,
      enriched_at: new Date().toISOString(),
    })
    .eq('id', listenId)

  if (error) {
    console.error(`Failed to update listen ${listenId}:`, error.message)
    return false
  }

  return true
}

/**
 * Enrich multiple listen records in batch
 * Returns statistics about the enrichment process
 */
export async function enrichListens(
  limit: number = 100,
  onProgress?: (stats: EnrichmentStats) => void
): Promise<EnrichmentStats> {
  const stats: EnrichmentStats = {
    total: 0,
    enriched: 0,
    failed: 0,
    skipped: 0,
  }

  try {
    // Get unenriched listens
    const unenrichedListens = await getUnenrichedListens(limit)
    stats.total = unenrichedListens.length

    if (unenrichedListens.length === 0) {
      console.log('No unenriched listens found')
      return stats
    }

    console.log(`Enriching ${unenrichedListens.length} listen records...`)

    // Process each listen one by one (to avoid rate limits)
    // We use the batchProcess utility which adds delays between requests
    for (const listen of unenrichedListens) {
      const result = await enrichSingleListen(listen)

      if (result) {
        const updated = await updateListenWithEnrichment(result.id, result.data)
        if (updated) {
          stats.enriched++
        } else {
          stats.failed++
        }
      } else {
        stats.skipped++
      }

      // Report progress if callback provided
      if (onProgress) {
        onProgress(stats)
      }

      // Add a small delay between each enrichment to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 350))
    }

    console.log('Enrichment complete:', stats)
    return stats
  } catch (error) {
    console.error('Error during enrichment process:', error)
    throw error
  }
}

/**
 * Enrich specific listen records by IDs
 * Useful for enriching newly uploaded data
 */
export async function enrichSpecificListens(
  listenIds: number[],
  onProgress?: (stats: EnrichmentStats) => void
): Promise<EnrichmentStats> {
  const stats: EnrichmentStats = {
    total: listenIds.length,
    enriched: 0,
    failed: 0,
    skipped: 0,
  }

  if (listenIds.length === 0) {
    return stats
  }

  try {
    // Fetch the listens by IDs
    const { data: listens, error } = await supabase
      .from('listens')
      .select('id, artist, track')
      .in('id', listenIds)
      .is('spotify_track_id', null)
      .not('artist', 'is', null)
      .not('track', 'is', null)

    if (error) {
      throw new Error(`Failed to fetch listens: ${error.message}`)
    }

    if (!listens || listens.length === 0) {
      console.log('No listens to enrich')
      return stats
    }

    // Process each listen
    for (const listen of listens) {
      const result = await enrichSingleListen(listen)

      if (result) {
        const updated = await updateListenWithEnrichment(result.id, result.data)
        if (updated) {
          stats.enriched++
        } else {
          stats.failed++
        }
      } else {
        stats.skipped++
      }

      if (onProgress) {
        onProgress(stats)
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 350))
    }

    return stats
  } catch (error) {
    console.error('Error enriching specific listens:', error)
    throw error
  }
}

/**
 * Get enrichment progress for current user
 */
export async function getEnrichmentProgress(): Promise<{
  total_listens: number
  enriched_listens: number
  percentage: number
}> {
  // Get total listens
  const { count: totalCount } = await supabase
    .from('listens')
    .select('*', { count: 'exact', head: true })

  // Get enriched listens
  const { count: enrichedCount } = await supabase
    .from('listens')
    .select('*', { count: 'exact', head: true })
    .not('spotify_track_id', 'is', null)

  const total = totalCount || 0
  const enriched = enrichedCount || 0
  const percentage = total > 0 ? Math.round((enriched / total) * 100) : 0

  return {
    total_listens: total,
    enriched_listens: enriched,
    percentage,
  }
}
