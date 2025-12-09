'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { parseAndMapJson } from '@/lib/upload/spotify-mapper'

export const dynamic = "force-dynamic"
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type StatusState = {
  state: 'idle' | 'validating' | 'uploading' | 'processing' | 'resetting' | 'success' | 'error'
  message: string
}

type UploadJobStatus = {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  filename: string
  totalFiles: number
  processedFiles: number
  totalRecords: number
  errorMessage?: string | null
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
        accept=".json,.zip,application/json,application/zip"
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
          <p className="text-sm font-medium">Drag and drop your Spotify data here</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Supports JSON files or ZIP archives (recommended)
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
  const router = useRouter()
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
          message: 'Select a Spotify listening history file or ZIP archive to begin.',
        }
      : {
          state: 'error',
          message: SUPABASE_CONFIG_ERROR_MESSAGE,
        },
  )
  const [progress, setProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [uploadJobId, setUploadJobId] = useState<string | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const resetState = useCallback(
    (message: StatusState['message'], state: StatusState['state']) => {
      setProgress(0)
      setSelectedFile(null)
      setStatus({ state, message })
      setUploadJobId(null)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    },
    [],
  )

  // Poll upload job status
  const pollUploadStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/uploads/${jobId}/status`)
      if (!response.ok) {
        throw new Error('Failed to fetch upload status')
      }

      const jobStatus: UploadJobStatus = await response.json()

      // Calculate progress
      const filesProgress = jobStatus.totalFiles > 0
        ? Math.round((jobStatus.processedFiles / jobStatus.totalFiles) * 100)
        : 0
      setProgress(filesProgress)

      // Update status message
      if (jobStatus.status === 'processing') {
        setStatus({
          state: 'processing',
          message: `Processing ${jobStatus.processedFiles}/${jobStatus.totalFiles} files... (${jobStatus.totalRecords} records inserted)`,
        })
      } else if (jobStatus.status === 'completed') {
        setProgress(100)
        setStatus({
          state: 'success',
          message: `Successfully processed ${jobStatus.totalFiles} files with ${jobStatus.totalRecords} listening records.`,
        })
        setSelectedFile(null)
        setUploadJobId(null)

        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }

        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else if (jobStatus.status === 'failed') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        setStatus({
          state: 'error',
          message: jobStatus.errorMessage || 'Upload processing failed. Please try again.',
        })
      }
    } catch (error) {
      console.error('Error polling upload status:', error)
    }
  }, [router])

  // Start polling when uploadJobId is set
  useEffect(() => {
    if (uploadJobId) {
      pollUploadStatus(uploadJobId)
      pollingIntervalRef.current = setInterval(() => {
        pollUploadStatus(uploadJobId)
      }, 2000) // Poll every 2 seconds
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [uploadJobId, pollUploadStatus])

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

  const handleZipUpload = useCallback(async (file: File) => {
    setStatus({ state: 'uploading', message: 'Uploading ZIP file...' })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/uploads/zip', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload ZIP file')
      }

      const result = await response.json()
      setUploadJobId(result.uploadJobId)
      setStatus({
        state: 'processing',
        message: `Uploaded ${result.totalFiles} files. Processing...`,
      })
    } catch (error) {
      console.error('ZIP upload error:', error)
      resetState(
        error instanceof Error ? error.message : 'Failed to upload ZIP file',
        'error'
      )
    }
  }, [resetState])

  const handleJsonUpload = useCallback(
    async (file: File, userId: string) => {
      setStatus({ state: 'validating', message: 'Validating file…' })

      let text: string
      try {
        text = await file.text()
      } catch (error) {
        console.error(error)
        resetState('Unable to read the file. Please try again.', 'error')
        return
      }

      const parseResult = parseAndMapJson(text, userId)

      if (!parseResult.success) {
        resetState(parseResult.error, 'error')
        return
      }

      const rows = parseResult.records

      if (rows.length === 0) {
        resetState('No valid listening records were found in the file.', 'error')
        return
      }

      setStatus({ state: 'uploading', message: 'Uploading data to Supabase…' })

      for (let index = 0; index < rows.length; index += BATCH_SIZE) {
        const batch = rows.slice(index, index + BATCH_SIZE)
        const { error } = await supabase!.from('listens').insert(batch)

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

      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    },
    [resetState, supabase, router],
  )

  const handleFile = useCallback(
    async (file: File) => {
      if (!supabase) {
        setSelectedFile(null)
        setProgress(0)
        setStatus({ state: 'error', message: SUPABASE_CONFIG_ERROR_MESSAGE })
        return
      }

      setSelectedFile(file)
      setProgress(0)

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        resetState('You must be signed in to upload data.', 'error')
        return
      }

      const fileName = file.name.toLowerCase()

      if (fileName.endsWith('.zip')) {
        await handleZipUpload(file)
      } else if (fileName.endsWith('.json')) {
        const allowedTypes = ['application/json', 'text/json', 'application/octet-stream']
        if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
          resetState('The selected file is not recognized as JSON.', 'error')
          return
        }
        await handleJsonUpload(file, userData.user.id)
      } else {
        resetState('Only JSON and ZIP files are supported.', 'error')
      }
    },
    [resetState, supabase, handleZipUpload, handleJsonUpload],
  )

  return (
    <Card className="mx-auto mt-12 max-w-xl space-y-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Upload your Spotify Listening History</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload JSON files individually or a ZIP archive with multiple files.
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
              Download the ZIP from Spotify&apos;s email and upload it directly here, or extract it and upload individual <code>StreamingHistory*.json</code> files.
            </li>
          </ol>
          <p className="mt-2">
            <strong>💡 Tip:</strong> Uploading the entire ZIP archive is faster and more convenient!
          </p>
        </details>
      </div>
      <UploadDropzone
        onFileAccepted={handleFile}
        isBusy={
          !supabase ||
          status.state === 'validating' ||
          status.state === 'uploading' ||
          status.state === 'processing' ||
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
            status.state === 'processing' ||
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
        {(status.state === 'uploading' || status.state === 'processing' || progress > 0) && (
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
