'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabaseClient'

export const dynamic = "force-dynamic"
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ListenInsert } from './spotify-parser'

type WorkerStatusMessage = {
  type: 'status'
  message: string
}

type WorkerSuccessMessage = {
  type: 'success'
  rows: ListenInsert[]
}

type WorkerErrorMessage = {
  type: 'error'
  message: string
}

type WorkerMessage = WorkerStatusMessage | WorkerSuccessMessage | WorkerErrorMessage

type StatusState = {
  state: 'idle' | 'validating' | 'uploading' | 'resetting' | 'success' | 'error'
  message: string
}

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
  const [status, setStatus] = useState<StatusState>({
    state: 'idle',
    message: 'Select a Spotify listening history JSON file to begin.',
  })
  const [progress, setProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const workerRef = useRef<Worker | null>(null)
  const supabase = useMemo(() => createSupabaseClient(), [])

  const resetState = useCallback(
    (message: StatusState['message'], state: StatusState['state']) => {
      setProgress(0)
      setSelectedFile(null)
      setStatus({ state, message })
    },
    [],
  )

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
  }, [])

  useEffect(() => () => terminateWorker(), [terminateWorker])

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
    setStatus({
      state: 'resetting',
      message: 'Deleting existing listens from Supabase…',
    })

    try {
      const { error } = await supabase.from('listens').delete().not('ts', 'is', null)

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

  const uploadRows = useCallback(
    async (rows: ListenInsert[]) => {
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
    },
    [resetState, supabase],
  )

  const handleFile = useCallback(
    (file: File) => {
      setSelectedFile(file)
      setProgress(0)
      setStatus({ state: 'validating', message: 'Validating file…' })

      if (!file.name.toLowerCase().endsWith('.json')) {
        resetState('Only JSON files are supported.', 'error')
        return
      }

      const allowedTypes = ['application/json', 'text/json', 'application/octet-stream']
      if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
        resetState('The selected file is not recognized as JSON.', 'error')
        return
      }

      terminateWorker()

      const worker = new Worker(new URL('./historyParser.worker.ts', import.meta.url))
      workerRef.current = worker

      worker.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
        const { data } = event

        if (data.type === 'status') {
          setStatus({ state: 'validating', message: data.message })
          return
        }

        if (data.type === 'error') {
          console.error(data.message)
          terminateWorker()
          resetState(data.message, 'error')
          return
        }

        if (data.type === 'success') {
          terminateWorker()
          void uploadRows(data.rows)
        }
      })

      worker.addEventListener('error', () => {
        terminateWorker()
        resetState(
          'An unexpected error occurred while processing the file.',
          'error',
        )
      })

      worker.postMessage({ type: 'parse', file })
    },
    [resetState, terminateWorker, uploadRows],
  )

  const handleCancelProcessing = useCallback(() => {
    terminateWorker()
    resetState('File processing cancelled.', 'idle')
  }, [resetState, terminateWorker])


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
          status.state === 'validating' ||
          status.state === 'uploading' ||
          status.state === 'resetting'
        }
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
      {status.state === 'validating' ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelProcessing}
          >
            Cancel processing
          </Button>
        </div>
      ) : null}
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
