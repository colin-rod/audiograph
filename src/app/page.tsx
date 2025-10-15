'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type SpotifyHistoryEntry = {
  endTime?: string | null
  ts?: string | null
  master_metadata_album_artist_name?: string | null
  artistName?: string | null
  master_metadata_track_name?: string | null
  trackName?: string | null
  msPlayed?: number | null
  ms_played?: number | null
}

type ListenInsert = {
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
  const ts =
    typeof value['ts'] === 'string' ? (value['ts'] as string) : null
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

  const entry: SpotifyHistoryEntry = {
    endTime,
    ts,
    master_metadata_album_artist_name: albumArtist,
    artistName,
    master_metadata_track_name: trackName,
    trackName: fallbackTrackName,
    msPlayed,
    ms_played: msPlayedSnake,
  }

  return entry
}

const toListenInsert = (entry: SpotifyHistoryEntry): ListenInsert | null => {
  const timestamp = entry.endTime ?? entry.ts
  if (!timestamp) {
    return null
  }

  const msPlayed = entry.msPlayed ?? entry.ms_played ?? null
  const artist =
    entry.master_metadata_album_artist_name ?? entry.artistName ?? null
  const track =
    entry.master_metadata_track_name ?? entry.trackName ?? null

  return {
    ts: new Date(timestamp),
    artist,
    track,
    ms_played: msPlayed,
  }
}

export default function UploadPage() {
  const [status, setStatus] = useState('')

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const parsed = JSON.parse(text)

    setStatus('Processing...')
    if (!Array.isArray(parsed)) {
      setStatus('Invalid file format')
      return
    }

    const rows = parsed
      .map(toSpotifyHistoryEntry)
      .filter((entry): entry is SpotifyHistoryEntry => entry !== null)
      .map(toListenInsert)
      .filter((row): row is ListenInsert => row !== null)

    if (rows.length === 0) {
      setStatus('No valid records found in file')
      return
    }

    const { error } = await supabase.from('listens').insert(rows)
    if (error) {
      console.error(error)
      setStatus('Error uploading data')
    } else {
      setStatus('Upload complete!')
    }
  }

  return (
    <Card className="p-6 max-w-md mx-auto mt-12 text-center">
      <h1 className="text-xl font-semibold mb-4">Upload your Spotify Listening History</h1>
      <input type="file" accept=".json" onChange={handleFile} className="mb-4" />
      <Button onClick={() => document.querySelector('input')?.click()}>Choose File</Button>
      <p className="mt-4 text-sm">{status}</p>
    </Card>
  )
}
