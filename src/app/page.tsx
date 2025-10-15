'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function UploadPage() {
  const [status, setStatus] = useState('')
  
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const data = JSON.parse(text)

    setStatus('Processing...')
    const rows = data.map((item: any) => ({
      ts: item.endTime ? new Date(item.endTime) : new Date(item.ts),
      artist: item.master_metadata_album_artist_name ?? item.artistName,
      track: item.master_metadata_track_name ?? item.trackName,
      ms_played: item.msPlayed ?? item.ms_played,
    }))

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