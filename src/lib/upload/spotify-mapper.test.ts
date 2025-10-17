import { describe, it, expect } from 'vitest'
import { mapSpotifyEntry, parseAndMapJson, type SpotifyHistoryEntry, type ListenInsert } from './spotify-mapper'

describe('mapSpotifyEntry', () => {
  const userId = 'test-user-123'

  it('maps old format (endTime, artistName, trackName, msPlayed)', () => {
    const oldFormatEntry: SpotifyHistoryEntry = {
      endTime: '2024-01-15T10:30:00Z',
      artistName: 'The Beatles',
      trackName: 'Hey Jude',
      msPlayed: 420000
    }

    const result = mapSpotifyEntry(oldFormatEntry, userId)

    expect(result).not.toBeNull()
    expect(result).toEqual({
      ts: new Date('2024-01-15T10:30:00Z'),
      artist: 'The Beatles',
      track: 'Hey Jude',
      ms_played: 420000,
      user_id: userId
    })
  })

  it('maps new format (ts, master_metadata_*, ms_played)', () => {
    const newFormatEntry: SpotifyHistoryEntry = {
      ts: '2024-01-15T10:30:00Z',
      master_metadata_album_artist_name: 'Pink Floyd',
      master_metadata_track_name: 'Comfortably Numb',
      ms_played: 382000
    }

    const result = mapSpotifyEntry(newFormatEntry, userId)

    expect(result).not.toBeNull()
    expect(result).toEqual({
      ts: new Date('2024-01-15T10:30:00Z'),
      artist: 'Pink Floyd',
      track: 'Comfortably Numb',
      ms_played: 382000,
      user_id: userId
    })
  })

  it('returns null for invalid entries with no timestamp', () => {
    const invalidEntry: SpotifyHistoryEntry = {
      artistName: 'No Timestamp',
      trackName: 'Invalid Song',
      msPlayed: 180000
    }

    const result = mapSpotifyEntry(invalidEntry, userId)

    expect(result).toBeNull()
  })

  it('handles missing optional fields', () => {
    const minimalEntry: SpotifyHistoryEntry = {
      ts: '2024-01-15T10:30:00Z'
    }

    const result = mapSpotifyEntry(minimalEntry, userId)

    expect(result).not.toBeNull()
    expect(result).toEqual({
      ts: new Date('2024-01-15T10:30:00Z'),
      artist: null,
      track: null,
      ms_played: null,
      user_id: userId
    })
  })

  it('prefers new format fields when both exist', () => {
    const mixedEntry: SpotifyHistoryEntry = {
      // New format (should be preferred)
      ts: '2024-01-15T12:00:00Z',
      master_metadata_album_artist_name: 'New Artist',
      master_metadata_track_name: 'New Track',
      ms_played: 300000,
      // Old format (should be ignored)
      endTime: '2024-01-15T10:00:00Z',
      artistName: 'Old Artist',
      trackName: 'Old Track',
      msPlayed: 200000
    }

    const result = mapSpotifyEntry(mixedEntry, userId)

    expect(result).not.toBeNull()
    expect(result?.artist).toBe('New Artist')
    expect(result?.track).toBe('New Track')
    expect(result?.ms_played).toBe(300000)
    expect(result?.ts).toEqual(new Date('2024-01-15T12:00:00Z'))
  })

  it('falls back to old format fields when new format is missing', () => {
    const fallbackEntry: SpotifyHistoryEntry = {
      endTime: '2024-01-15T10:00:00Z',
      artistName: 'Fallback Artist',
      trackName: 'Fallback Track',
      msPlayed: 200000
    }

    const result = mapSpotifyEntry(fallbackEntry, userId)

    expect(result).not.toBeNull()
    expect(result?.artist).toBe('Fallback Artist')
    expect(result?.track).toBe('Fallback Track')
    expect(result?.ms_played).toBe(200000)
  })

  it('handles invalid date strings gracefully', () => {
    const invalidDateEntry: SpotifyHistoryEntry = {
      ts: 'not-a-valid-date',
      artistName: 'Test Artist',
      msPlayed: 180000
    }

    const result = mapSpotifyEntry(invalidDateEntry, userId)

    expect(result).toBeNull()
  })
})

describe('parseAndMapJson', () => {
  const userId = 'test-user-456'

  it('parses valid JSON array', () => {
    const jsonContent = JSON.stringify([
      {
        ts: '2024-01-01T00:00:00Z',
        master_metadata_album_artist_name: 'Artist 1',
        master_metadata_track_name: 'Track 1',
        ms_played: 180000
      },
      {
        endTime: '2024-01-02T00:00:00Z',
        artistName: 'Artist 2',
        trackName: 'Track 2',
        msPlayed: 240000
      }
    ])

    const result = parseAndMapJson(jsonContent, userId)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.records).toHaveLength(2)
      expect(result.records[0].artist).toBe('Artist 1')
      expect(result.records[1].artist).toBe('Artist 2')
    }
  })

  it('filters and maps entries to ListenInsert format', () => {
    const jsonContent = JSON.stringify([
      {
        ts: '2024-01-01T00:00:00Z',
        master_metadata_album_artist_name: 'Valid Artist',
        master_metadata_track_name: 'Valid Track',
        ms_played: 180000
      },
      {
        // Missing timestamp - should be filtered out
        artistName: 'No Timestamp Artist',
        trackName: 'No Timestamp Track',
        msPlayed: 240000
      },
      {
        ts: '2024-01-03T00:00:00Z',
        master_metadata_album_artist_name: 'Another Valid Artist',
        master_metadata_track_name: 'Another Valid Track',
        ms_played: 200000
      }
    ])

    const result = parseAndMapJson(jsonContent, userId)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.records).toHaveLength(2)
      expect(result.records[0].artist).toBe('Valid Artist')
      expect(result.records[1].artist).toBe('Another Valid Artist')
    }
  })

  it('deduplicates by timestamp+artist+track+ms_played', () => {
    const jsonContent = JSON.stringify([
      {
        ts: '2024-01-01T00:00:00Z',
        master_metadata_album_artist_name: 'Artist',
        master_metadata_track_name: 'Track',
        ms_played: 180000
      },
      {
        // Exact duplicate
        ts: '2024-01-01T00:00:00Z',
        master_metadata_album_artist_name: 'Artist',
        master_metadata_track_name: 'Track',
        ms_played: 180000
      },
      {
        // Different ms_played - not a duplicate
        ts: '2024-01-01T00:00:00Z',
        master_metadata_album_artist_name: 'Artist',
        master_metadata_track_name: 'Track',
        ms_played: 190000
      }
    ])

    const result = parseAndMapJson(jsonContent, userId)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.records).toHaveLength(2)
    }
  })

  it('returns validation errors for non-array JSON', () => {
    const jsonContent = JSON.stringify({
      error: 'This is an object, not an array'
    })

    const result = parseAndMapJson(jsonContent, userId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Expected an array')
    }
  })

  it('returns error for invalid JSON', () => {
    const invalidJson = '{ this is not valid JSON }'

    const result = parseAndMapJson(invalidJson, userId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Invalid JSON')
    }
  })

  it('returns error when no valid records found', () => {
    const jsonContent = JSON.stringify([
      { artistName: 'No Timestamp 1' },
      { artistName: 'No Timestamp 2' }
    ])

    const result = parseAndMapJson(jsonContent, userId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('No valid listening records')
    }
  })

  it('handles empty array gracefully', () => {
    const jsonContent = JSON.stringify([])

    const result = parseAndMapJson(jsonContent, userId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('No valid listening records')
    }
  })
})
