'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type ListenSummaryRow = {
  ms_played: number | null
  artist: string | null
  track: string | null
}

type DashboardStats = {
  totalHours: string
  artists: number
  tracks: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const toListenSummaryRow = (value: unknown): ListenSummaryRow | null => {
  if (!isRecord(value)) {
    return null
  }

  const msPlayed =
    typeof value['ms_played'] === 'number'
      ? (value['ms_played'] as number)
      : null
  const artist =
    typeof value['artist'] === 'string'
      ? (value['artist'] as string)
      : null
  const track =
    typeof value['track'] === 'string'
      ? (value['track'] as string)
      : null

  return { ms_played: msPlayed, artist, track }
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('listens')
        .select('ms_played, artist, track')

      if (error) {
        console.error(error)
        return
      }

      const listens = (data ?? [])
        .map(toListenSummaryRow)
        .filter(
          (row): row is ListenSummaryRow => row !== null
        )

      const totalMs = listens.reduce(
        (acc, listen) => acc + (listen.ms_played ?? 0),
        0
      )
      const totalHours = (totalMs / (1000 * 60 * 60)).toFixed(1)
      const artists = new Set(
        listens.map((listen) => listen.artist).filter(Boolean)
      ).size
      const tracks = new Set(
        listens.map((listen) => listen.track).filter(Boolean)
      ).size

      setStats({ totalHours, artists, tracks })
    }
    fetchData()
  }, [])

  if (!stats) return <p className="text-center mt-12">Loading...</p>

  return (
    <div className="max-w-3xl mx-auto mt-12 text-center">
      <h1 className="text-3xl font-semibold mb-8">Your Listening Summary</h1>
      <div className="grid grid-cols-3 gap-6">
        <div><p className="text-2xl font-bold">{stats.totalHours}</p><p>Hours</p></div>
        <div><p className="text-2xl font-bold">{stats.artists}</p><p>Artists</p></div>
        <div><p className="text-2xl font-bold">{stats.tracks}</p><p>Tracks</p></div>
      </div>
    </div>
  )
}
