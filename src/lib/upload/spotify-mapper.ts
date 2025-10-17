/**
 * Spotify History Entry Types
 * Supports both old and new Spotify export formats
 */
export type SpotifyHistoryEntry = {
  // New format (preferred)
  ts?: string | null
  master_metadata_album_artist_name?: string | null
  master_metadata_track_name?: string | null
  ms_played?: number | null

  // Old format (fallback)
  endTime?: string | null
  artistName?: string | null
  trackName?: string | null
  msPlayed?: number | null
}

/**
 * Database insert format for a listening record
 */
export type ListenInsert = {
  ts: Date
  artist: string | null
  track: string | null
  ms_played: number | null
  user_id: string
}

export type ParseSuccess = {
  success: true
  records: ListenInsert[]
}

export type ParseError = {
  success: false
  error: string
}

export type ParseResult = ParseSuccess | ParseError

/**
 * Type guard to check if a value is a record object
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * Converts unknown value to SpotifyHistoryEntry or null
 */
const toSpotifyHistoryEntry = (value: unknown): SpotifyHistoryEntry | null => {
  if (!isRecord(value)) {
    return null
  }

  const entry: SpotifyHistoryEntry = {
    // New format fields
    ts: typeof value['ts'] === 'string' ? value['ts'] : null,
    master_metadata_album_artist_name:
      typeof value['master_metadata_album_artist_name'] === 'string'
        ? value['master_metadata_album_artist_name']
        : null,
    master_metadata_track_name:
      typeof value['master_metadata_track_name'] === 'string'
        ? value['master_metadata_track_name']
        : null,
    ms_played:
      typeof value['ms_played'] === 'number' ? value['ms_played'] : null,

    // Old format fields
    endTime: typeof value['endTime'] === 'string' ? value['endTime'] : null,
    artistName: typeof value['artistName'] === 'string' ? value['artistName'] : null,
    trackName: typeof value['trackName'] === 'string' ? value['trackName'] : null,
    msPlayed: typeof value['msPlayed'] === 'number' ? value['msPlayed'] : null,
  }

  return entry
}

/**
 * Maps a Spotify history entry to ListenInsert format
 * Prefers new format fields, falls back to old format
 *
 * @param entry - Spotify history entry
 * @param userId - User ID to associate with the record
 * @returns Mapped ListenInsert or null if invalid
 */
export function mapSpotifyEntry(
  entry: SpotifyHistoryEntry,
  userId: string
): ListenInsert | null {
  // Get timestamp (prefer new format)
  const timestamp = entry.ts ?? entry.endTime
  if (!timestamp) {
    return null
  }

  // Parse and validate date
  const parsedDate = new Date(timestamp)
  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  // Map fields (prefer new format)
  const msPlayed = entry.ms_played ?? entry.msPlayed ?? null
  const artist = entry.master_metadata_album_artist_name ?? entry.artistName ?? null
  const track = entry.master_metadata_track_name ?? entry.trackName ?? null

  return {
    ts: parsedDate,
    artist,
    track,
    ms_played: msPlayed,
    user_id: userId,
  }
}

/**
 * Parses JSON content and maps to ListenInsert records
 * Includes deduplication logic
 *
 * @param jsonContent - Raw JSON string
 * @param userId - User ID to associate with records
 * @returns Parse result with records or error
 */
export function parseAndMapJson(
  jsonContent: string,
  userId: string
): ParseResult {
  // Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonContent)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error
        ? `Invalid JSON: ${error.message}`
        : 'Invalid JSON format'
    }
  }

  // Validate array format
  if (!Array.isArray(parsed)) {
    return {
      success: false,
      error: 'Expected an array of listening records in the JSON file.'
    }
  }

  // Map and filter entries
  const mappedRecords = parsed
    .map(toSpotifyHistoryEntry)
    .filter((entry): entry is SpotifyHistoryEntry => entry !== null)
    .map((entry) => mapSpotifyEntry(entry, userId))
    .filter((record): record is ListenInsert => record !== null)

  // Deduplicate records
  const uniqueRecords = new Map<string, ListenInsert>()
  for (const record of mappedRecords) {
    const key = [
      record.ts.toISOString(),
      record.track ?? '',
      record.artist ?? '',
      record.ms_played === null ? '' : record.ms_played.toString(),
    ].join('|')

    if (!uniqueRecords.has(key)) {
      uniqueRecords.set(key, record)
    }
  }

  const records = Array.from(uniqueRecords.values())

  // Validate we have at least one valid record
  if (records.length === 0) {
    return {
      success: false,
      error: 'No valid listening records were found in the file.'
    }
  }

  return {
    success: true,
    records
  }
}
