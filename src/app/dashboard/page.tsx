'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('listens').select('*')
      if (error) console.error(error)
      else {
        const totalMs = data.reduce((acc, x) => acc + (x.ms_played ?? 0), 0)
        const totalHours = (totalMs / (1000 * 60 * 60)).toFixed(1)
        const artists = new Set(data.map((x) => x.artist)).size
        const tracks = new Set(data.map((x) => x.track)).size
        setStats({ totalHours, artists, tracks })
      }
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