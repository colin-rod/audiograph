'use client'
import { useCallback, useMemo, useRef, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import {
  parseSpotifyHistory,
  SpotifyHistoryParseError,
  type ListenInsert,
} from '@/lib/spotifyHistory'
import { useUploadStatus } from '@/lib/useUploadStatus'
import { cn } from '@/lib/utils'

export const dynamic = "force-dynamic"
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const BATCH_SIZE = 500

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
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/40',
            isBusy ? 'opacity-70' : 'cursor-pointer hover:border-primary',
          )}
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
  const [progress, setProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const supabase = useMemo(() => createSupabaseClient(), [])
  const {
    status,
    setError,
    setResetting,
    setSuccess,
    setUploading,
    setValidating,
    isBusy,
  } = useUploadStatus('Select a Spotify listening history JSON file to begin.')

  const resetToError = useCallback(
    (message: string) => {
      setProgress(0)
      setSelectedFile(null)
      setError(message)
    },
    [setError],
  )

  const handleResetRequest = useCallback(() => {
    setIsResetDialogOpen(true)
  }, [])

  const handleCancelReset = useCallback(() => {
    setIsResetDialogOpen(false)
  }, [])

  const handleConfirmReset = useCallback(async () => {
    setIsResetDialogOpen(false)
    setProgress(0)
    setSelectedFile(null)
    setResetting('Deleting existing listens from Supabase…')

    try {
      const { error } = await supabase.from('listens').delete().not('ts', 'is', null)

      if (error) {
        console.error(error)
        setError('Supabase returned an error while deleting. Please try again.')
        return
      }

      setSuccess('All uploaded listens have been deleted.')
    } catch (error) {
      console.error(error)
      setError('An unexpected error occurred while deleting data. Please try again.')
    }
  }, [setError, setResetting, setSuccess, supabase])

  const handleFile = useCallback(
    async (file: File) => {
      setSelectedFile(file)
      setProgress(0)
      setValidating('Validating file…')

      if (!file.name.toLowerCase().endsWith('.json')) {
        resetToError('Only JSON files are supported.')
        return
      }

      const allowedTypes = ['application/json', 'text/json', 'application/octet-stream']
      if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
        resetToError('The selected file is not recognized as JSON.')
        return
      }

      let text: string
      try {
        text = await file.text()
      } catch (error) {
        console.error(error)
        resetToError('Unable to read the file. Please try again.')
        return
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch (error) {
        console.error(error)
        resetToError('The file does not contain valid JSON.')
        return
      }

      let rows: ListenInsert[]
      try {
        rows = parseSpotifyHistory(parsed)
      } catch (error) {
        if (error instanceof SpotifyHistoryParseError) {
          resetToError(error.message)
          return
        }

        console.error(error)
        resetToError('An unexpected error occurred while processing the file.')
        return
      }

      setUploading('Uploading data to Supabase…')

      for (let index = 0; index < rows.length; index += BATCH_SIZE) {
        const batch = rows.slice(index, index + BATCH_SIZE)
        const { error } = await supabase.from('listens').insert(batch)

        if (error) {
          console.error(error)
          resetToError('Supabase returned an error while uploading. Please try again.')
          return
        }

        const uploadedCount = Math.min(index + batch.length, rows.length)
        const percent = Math.round((uploadedCount / rows.length) * 100)
        setProgress(percent)
      }

      setProgress(100)
      setSelectedFile(null)
      setSuccess(`Successfully uploaded ${rows.length} listening records.`)
    },
    [resetToError, setSuccess, setUploading, setValidating, supabase],
  )


  return (
    <Card className="mx-auto mt-12 max-w-xl space-y-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Upload your Spotify Listening History</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Drag in the JSON exports downloaded from Spotify to add them to Supabase.
        </p>
      </div>
      <UploadDropzone
        onFileAccepted={handleFile}
        isBusy={isBusy}
        selectedFile={selectedFile}
      />
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={handleResetRequest}
          disabled={
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
