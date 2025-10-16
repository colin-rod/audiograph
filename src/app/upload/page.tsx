'use client'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabaseClient'

export const dynamic = "force-dynamic"
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

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
  user_id: string
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

const toListenInsert = (entry: SpotifyHistoryEntry, userId: string): ListenInsert | null => {
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
    user_id: userId,
  }
}

type StatusState = {
  state: 'idle' | 'validating' | 'uploading' | 'resetting' | 'success' | 'error'
  message: string
}

const BATCH_SIZE = 500
const SUPABASE_CONFIG_ERROR_MESSAGE =
  'Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable uploads.'

const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${size} B`
}

type UploadDropzoneProps = {
  onFileAccepted: (file: File) => void
  isBusy: boolean
  selectedFile: File | null
}

function UploadDropzone({ onFileAccepted, isBusy, selectedFile }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const [file] = Array.from(files)
    onFileAccepted(file)
  }

  const onDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (isBusy) return
    setIsDragging(true)
  }

  const onDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return
    }
    setIsDragging(false)
  }

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
    if (isBusy) return
    handleFiles(event.dataTransfer.files)
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        id="spotify-upload"
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
        disabled={isBusy}
      />
      <label htmlFor="spotify-upload" className="block">
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              inputRef.current?.click()
            }
          }}
          onClick={() => inputRef.current?.click()}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/40'
          } ${isBusy ? 'opacity-70' : 'cursor-pointer hover:border-primary'}`}
        >
          <p className="text-sm font-medium">Drag and drop your Spotify JSON export here</p>
          <p className="mt-2 text-xs text-muted-foreground">
            or click to choose a file from your computer
          </p>
          {selectedFile ? (
            <p className="mt-4 text-sm font-medium">
              Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </p>
          ) : null}
        </div>
      </label>
      <div className="flex justify-center">
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
        >
          Choose File
        </Button>
      </div>
    </div>
  )
}

export default function UploadPage() {
  const supabase = useMemo(() => {
    try {
      return createSupabaseClient()
    } catch (error) {
      console.error(error)
      return null
    }
  }, [])

  const [status, setStatus] = useState<StatusState>(() =>
    supabase
      ? {
          state: 'idle',
          message: 'Select a Spotify listening history JSON file to begin.',
        }
      : {
          state: 'error',
          message: SUPABASE_CONFIG_ERROR_MESSAGE,
        },
  )
  const [progress, setProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const supabase = useMemo(() => createSupabaseClient(), [])
  const router = useRouter()
  const hasRedirectedRef = useRef(false)

  const resetState = useCallback(
    (message: StatusState['message'], state: StatusState['state']) => {
      setProgress(0)
      setSelectedFile(null)
      setStatus({ state, message })
    },
    [],
  )

  const handleResetRequest = useCallback(() => {
    if (!supabase) {
      setStatus({ state: 'error', message: SUPABASE_CONFIG_ERROR_MESSAGE })
      return
    }
    setIsResetDialogOpen(true)
  }, [supabase])

  const handleCancelReset = useCallback(() => {
    setIsResetDialogOpen(false)
  }, [])

  const handleConfirmReset = useCallback(async () => {
    setIsResetDialogOpen(false)
    if (!supabase) {
      setStatus({ state: 'error', message: SUPABASE_CONFIG_ERROR_MESSAGE })
      return
    }
    setProgress(0)
    setSelectedFile(null)
    setStatus({
      state: 'resetting',
      message: 'Deleting existing listens from Supabase…',
    })

    try {
      // Get the current user ID
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        setStatus({
          state: 'error',
          message: 'You must be signed in to delete data.',
        })
        return
      }

      const { error } = await supabase
        .from('listens')
        .delete()
        .eq('user_id', userData.user.id)

      if (error) {
        console.error(error)
        setStatus({
          state: 'error',
          message: 'Supabase returned an error while deleting. Please try again.',
        })
        return
      }

      setStatus({
        state: 'success',
        message: 'All uploaded listens have been deleted.',
      })
    } catch (error) {
      console.error(error)
      setStatus({
        state: 'error',
        message:
          'An unexpected error occurred while deleting data. Please try again.',
      })
    }
  }, [supabase])

  const handleFile = useCallback(
    async (file: File) => {
      hasRedirectedRef.current = false
      if (!supabase) {
        setSelectedFile(null)
        setProgress(0)
        setStatus({ state: 'error', message: SUPABASE_CONFIG_ERROR_MESSAGE })
        return
      }

      setSelectedFile(file)
      setProgress(0)
      setStatus({ state: 'validating', message: 'Validating file…' })

      // Get the current user ID
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        resetState('You must be signed in to upload data.', 'error')
        return
      }
      const userId = userData.user.id

      if (!file.name.toLowerCase().endsWith('.json')) {
        resetState('Only JSON files are supported.', 'error')
        return
      }

      const allowedTypes = ['application/json', 'text/json', 'application/octet-stream']
      if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
        resetState('The selected file is not recognized as JSON.', 'error')
        return
      }

      let text: string
      try {
        text = await file.text()
      } catch (error) {
        console.error(error)
        resetState('Unable to read the file. Please try again.', 'error')
        return
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch (error) {
        console.error(error)
        resetState('The file does not contain valid JSON.', 'error')
        return
      }

      if (!Array.isArray(parsed)) {
        resetState('Expected an array of listening records in the JSON file.', 'error')
        return
      }

      const parsedRows = parsed
        .map(toSpotifyHistoryEntry)
        .filter((entry): entry is SpotifyHistoryEntry => entry !== null)
        .map((entry) => toListenInsert(entry, userId))
        .filter((row): row is ListenInsert => row !== null)

      const uniqueRows = new Map<string, ListenInsert>()
      for (const row of parsedRows) {
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

      const rows = Array.from(uniqueRows.values())

      if (rows.length === 0) {
        resetState('No valid listening records were found in the file.', 'error')
        return
      }

      const hasTimestamp = rows.some((row) => row.ts instanceof Date && !isNaN(row.ts.getTime()))
      if (!hasTimestamp) {
        resetState('No timestamp information found in the uploaded file.', 'error')
        return
      }

      setStatus({ state: 'uploading', message: 'Uploading data to Supabase…' })

      for (let index = 0; index < rows.length; index += BATCH_SIZE) {
        const batch = rows.slice(index, index + BATCH_SIZE)
        const { error } = await supabase.from('listens').insert(batch)

        if (error) {
          console.error(error)
          resetState(
            'Supabase returned an error while uploading. Please try again.',
            'error',
          )
          return
        }

        const uploadedCount = Math.min(index + batch.length, rows.length)
        const percent = Math.round((uploadedCount / rows.length) * 100)
        setProgress(percent)
      }

      setProgress(100)
      setSelectedFile(null)
      setStatus({
        state: 'success',
        message: `Successfully uploaded ${rows.length} listening records.`,
      })
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true
        router.push('/dashboard')
      }
    },
    [resetState, router, supabase],
  )


  return (
    <Card className="mx-auto mt-12 max-w-xl space-y-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Upload your Spotify Listening History</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Drag in the JSON exports downloaded from Spotify to add them to Supabase.
        </p>
        <details className="mt-4 text-left text-sm text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">
            Need help downloading your Spotify data?
          </summary>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li>
              Visit Spotify&apos;s{' '}
              <a
                className="underline"
                href="https://www.spotify.com/account/privacy/"
                target="_blank"
                rel="noreferrer"
              >
                Privacy Settings
              </a>{' '}
              and sign in.
            </li>
            <li>Select <strong>Download your data</strong>, then choose the <strong>Extended streaming history</strong> option.</li>
            <li>Submit the request and wait for Spotify&apos;s email confirming your archive is ready.</li>
            <li>
              Download the ZIP from Spotify&apos;s email, extract it, and drag the <code>StreamingHistory*.json</code>{' '}
              files into this uploader.
            </li>
          </ol>
          <p className="mt-2">
            Spotify can take a few days to prepare the archive, so keep an eye on your inbox.
          </p>
        </details>
      </div>
      <UploadDropzone
        onFileAccepted={handleFile}
        isBusy={
          !supabase ||
          status.state === 'validating' ||
          status.state === 'uploading' ||
          status.state === 'resetting'
        }
        selectedFile={selectedFile}
      />
      <div className="flex justify-center">
        <Button
          type="button"
          variant="secondary"
          onClick={handleResetRequest}
          disabled={
            !supabase ||
            status.state === 'validating' ||
            status.state === 'uploading' ||
            status.state === 'resetting'
          }
          aria-label="Reset uploaded data"
        >
          Reset uploaded data
        </Button>
      </div>
      <ConfirmDialog
        open={isResetDialogOpen}
        onCancel={handleCancelReset}
        onConfirm={handleConfirmReset}
        title="Delete uploaded listens?"
        description="This will remove all uploaded listening history from Supabase. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
      <div className="space-y-2">
        {(status.state === 'uploading' || progress > 0) && (
          <Progress value={progress} aria-live="polite" />
        )}
        <p
          className={`text-sm ${
            status.state === 'error'
              ? 'text-destructive'
              : status.state === 'success'
              ? 'text-green-600'
              : 'text-muted-foreground'
          }`}
          aria-live="polite"
        >
          {status.message}
        </p>
      </div>
    </Card>
  )
}
