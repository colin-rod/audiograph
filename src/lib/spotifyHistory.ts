export type SpotifyHistoryEntry = {
  endTime?: string | null
  ts?: string | null
  master_metadata_album_artist_name?: string | null
  artistName?: string | null
  master_metadata_track_name?: string | null
  trackName?: string | null
  msPlayed?: number | null
  ms_played?: number | null
}

export type ListenInsert = {
  ts: Date
  artist: string | null
  track: string | null
  ms_played: number | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const toSpotifyHistoryEntry = (value: unknown): SpotifyHistoryEntry | null => {
  if (!isRecord(value)) {
    return null
  }

  const endTime =
    typeof value['endTime'] === 'string' ? (value['endTime'] as string) : null
  const ts = typeof value['ts'] === 'string' ? (value['ts'] as string) : null
  const albumArtist =
    typeof value['master_metadata_album_artist_name'] === 'string'
      ? (value['master_metadata_album_artist_name'] as string)
      : null
  const artistName =
    typeof value['artistName'] === 'string'
      ? (value['artistName'] as string)
      : null
  const trackName =
    typeof value['master_metadata_track_name'] === 'string'
      ? (value['master_metadata_track_name'] as string)
      : null
  const fallbackTrackName =
    typeof value['trackName'] === 'string'
      ? (value['trackName'] as string)
      : null
  const msPlayed =
    typeof value['msPlayed'] === 'number'
      ? (value['msPlayed'] as number)
      : null
  const msPlayedSnake =
    typeof value['ms_played'] === 'number'
      ? (value['ms_played'] as number)
      : null

  return {
    endTime,
    ts,
    master_metadata_album_artist_name: albumArtist,
    artistName,
    master_metadata_track_name: trackName,
    trackName: fallbackTrackName,
    msPlayed,
    ms_played: msPlayedSnake,
  }
}

const toListenInsert = (entry: SpotifyHistoryEntry): ListenInsert | null => {
  const timestamp = entry.endTime ?? entry.ts
  if (!timestamp) {
    return null
  }

  const parsedDate = new Date(timestamp)
  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  const msPlayed = entry.msPlayed ?? entry.ms_played ?? null
  const artist =
    entry.master_metadata_album_artist_name ?? entry.artistName ?? null
  const track =
    entry.master_metadata_track_name ?? entry.trackName ?? null

  return {
    ts: parsedDate,
    artist,
    track,
    ms_played: msPlayed,
  }
}

const dedupeListens = (rows: ListenInsert[]): ListenInsert[] => {
  const uniqueRows = new Map<string, ListenInsert>()

  for (const row of rows) {
    const key = [
      row.ts.toISOString(),
      row.track ?? '',
      row.artist ?? '',
      row.ms_played === null ? '' : row.ms_played.toString(),
    ].join('|')

    if (!uniqueRows.has(key)) {
      uniqueRows.set(key, row)
    }
  }

  return Array.from(uniqueRows.values())
}

export class SpotifyHistoryParseError extends Error {}

export const parseSpotifyHistory = (raw: unknown): ListenInsert[] => {
  if (!Array.isArray(raw)) {
    throw new SpotifyHistoryParseError(
      'Expected an array of listening records in the JSON file.',
    )
  }

  const parsedRows = raw
    .map(toSpotifyHistoryEntry)
    .filter((entry): entry is SpotifyHistoryEntry => entry !== null)
    .map(toListenInsert)
    .filter((row): row is ListenInsert => row !== null)

  const rows = dedupeListens(parsedRows)

  if (rows.length === 0) {
    throw new SpotifyHistoryParseError(
      'No valid listening records were found in the file.',
    )
  }

  const hasTimestamp = rows.some(
    (row) => row.ts instanceof Date && !Number.isNaN(row.ts.getTime()),
  )

  if (!hasTimestamp) {
    throw new SpotifyHistoryParseError(
      'No timestamp information found in the uploaded file.',
    )
  }

  return rows
}
