'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabaseClient'

export const dynamic = "force-dynamic"
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { X, FileJson, CheckCircle2, AlertCircle } from 'lucide-react'

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

type SelectedFile = {
  file: File
  valid: boolean
  error?: string
}

const SUPABASE_CONFIG_ERROR_MESSAGE =
  'Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable uploads.'

const SPOTIFY_FILE_PATTERNS = [
  /Streaming_History_Audio.*\.json$/i,
  /StreamingHistory.*\.json$/i,
  /endsong.*\.json$/i
]

const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${size} B`
}

function isSpotifyFile(filename: string): boolean {
  return SPOTIFY_FILE_PATTERNS.some(pattern => pattern.test(filename))
}

function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file.name.toLowerCase().endsWith('.json')) {
    return { valid: false, error: 'Not a JSON file' }
  }

  if (!isSpotifyFile(file.name)) {
    return { valid: false, error: 'Not a recognized Spotify file format' }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File too large (max 10MB)' }
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty' }
  }

  return { valid: true }
}

type FileListDisplayProps = {
  selectedFiles: SelectedFile[]
  onRemoveFile: (index: number) => void
  isBusy: boolean
}

function FileListDisplay({ selectedFiles, onRemoveFile, isBusy }: FileListDisplayProps) {
  const validFiles = selectedFiles.filter(sf => sf.valid)
  const invalidFiles = selectedFiles.filter(sf => !sf.valid)

  return (
    <div className="space-y-4">
      {validFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Ready to upload ({validFiles.length} file{validFiles.length === 1 ? '' : 's'})
          </h3>
          <div className="space-y-1">
            {selectedFiles.map((sf, index) => {
              if (!sf.valid) return null
              return (
                <div
                  key={index}
                  className="flex items-center justify-between rounded border border-green-200 bg-green-50 p-2 text-sm dark:border-green-900 dark:bg-green-950"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileJson className="h-4 w-4 shrink-0 text-green-600" />
                    <span className="truncate font-medium">{sf.file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({formatFileSize(sf.file.size)})
                    </span>
                  </div>
                  <button
                    onClick={() => onRemoveFile(index)}
                    disabled={isBusy}
                    className="ml-2 rounded p-1 hover:bg-green-100 dark:hover:bg-green-900 disabled:opacity-50"
                    aria-label={`Remove ${sf.file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {invalidFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            Invalid files ({invalidFiles.length})
          </h3>
          <div className="space-y-1">
            {selectedFiles.map((sf, index) => {
              if (sf.valid) return null
              return (
                <div
                  key={index}
                  className="flex items-center justify-between rounded border border-amber-200 bg-amber-50 p-2 text-sm dark:border-amber-900 dark:bg-amber-950"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileJson className="h-4 w-4 shrink-0 text-amber-600" />
                    <span className="truncate">{sf.file.name}</span>
                    <span className="text-xs text-amber-600 truncate">({sf.error})</span>
                  </div>
                  <button
                    onClick={() => onRemoveFile(index)}
                    disabled={isBusy}
                    className="ml-2 rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900 disabled:opacity-50"
                    aria-label={`Remove ${sf.file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

type UploadDropzoneProps = {
  onFilesAccepted: (files: File[]) => void
  isBusy: boolean
  selectedFiles: SelectedFile[]
}

function UploadDropzone({ onFilesAccepted, isBusy, selectedFiles }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    onFilesAccepted(Array.from(files))
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

  const hasFiles = selectedFiles.length > 0

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        id="spotify-upload"
        type="file"
        accept=".json,application/json"
        multiple
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
          <FileJson className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm font-medium">
            {hasFiles ? 'Add more JSON files' : 'Drag and drop JSON files here'}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Select one or multiple Spotify JSON files
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            (Streaming_History_Audio_*.json, StreamingHistory*.json, or endsong*.json)
          </p>
        </div>
      </label>
      <div className="flex justify-center">
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
        >
          {hasFiles ? 'Add More Files' : 'Choose Files'}
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
          message: 'Select one or more Spotify JSON files to begin.',
        }
      : {
          state: 'error',
          message: SUPABASE_CONFIG_ERROR_MESSAGE,
        },
  )
  const [progress, setProgress] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [uploadJobId, setUploadJobId] = useState<string | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const validFileCount = selectedFiles.filter(sf => sf.valid).length

  const resetState = useCallback(
    (message: StatusState['message'], state: StatusState['state']) => {
      setProgress(0)
      setSelectedFiles([])
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
        setSelectedFiles([])
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

  const handleFilesAccepted = useCallback((files: File[]) => {
    const newFiles: SelectedFile[] = files.map(file => {
      const validation = validateFile(file)
      return {
        file,
        valid: validation.valid,
        error: validation.error
      }
    })

    setSelectedFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpload = useCallback(async () => {
    if (!supabase) {
      setStatus({ state: 'error', message: SUPABASE_CONFIG_ERROR_MESSAGE })
      return
    }

    const validFiles = selectedFiles.filter(sf => sf.valid)
    if (validFiles.length === 0) {
      setStatus({ state: 'error', message: 'No valid files selected' })
      return
    }

    setStatus({ state: 'uploading', message: `Uploading ${validFiles.length} file${validFiles.length === 1 ? '' : 's'}...` })

    try {
      const formData = new FormData()
      validFiles.forEach(sf => {
        formData.append('files', sf.file)
      })

      const response = await fetch('/api/uploads/json', {
        method: 'POST',
        body: formData,
      })

      // Check content type before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('[Upload] Non-JSON response:', text.substring(0, 500))
        throw new Error(`Server error: ${response.status} ${response.statusText}. The server returned HTML instead of JSON. Check server logs.`)
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload files')
      }

      const result = await response.json()
      setUploadJobId(result.uploadJobId)
      setStatus({
        state: 'processing',
        message: result.message,
      })

      // Show warnings if any files were skipped
      if (result.skippedFiles > 0 && result.errors) {
        console.warn('Some files were skipped:', result.errors)
      }
    } catch (error) {
      console.error('Upload error:', error)
      resetState(
        error instanceof Error ? error.message : 'Failed to upload files',
        'error'
      )
    }
  }, [supabase, selectedFiles, resetState])

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
    setSelectedFiles([])
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

  const isBusy = ['validating', 'uploading', 'processing', 'resetting'].includes(status.state)

  return (
    <div className="container mx-auto max-w-3xl p-6">
      <Card className="p-6">
        <h1 className="mb-6 text-2xl font-bold">Upload Spotify Data</h1>

        <div className="space-y-6">
          <UploadDropzone
            onFilesAccepted={handleFilesAccepted}
            isBusy={isBusy}
            selectedFiles={selectedFiles}
          />

          {selectedFiles.length > 0 && (
            <FileListDisplay
              selectedFiles={selectedFiles}
              onRemoveFile={handleRemoveFile}
              isBusy={isBusy}
            />
          )}

          {validFileCount > 0 && (
            <div className="flex justify-center">
              <Button
                onClick={handleUpload}
                disabled={isBusy}
                size="lg"
              >
                Upload {validFileCount} File{validFileCount === 1 ? '' : 's'}
              </Button>
            </div>
          )}

          {(status.state !== 'idle' || progress > 0) && (
            <div className="space-y-2">
              <p className="text-sm">
                <span
                  className={
                    status.state === 'error'
                      ? 'text-red-600'
                      : status.state === 'success'
                        ? 'text-green-600'
                        : ''
                  }
                >
                  {status.message}
                </span>
              </p>
              {progress > 0 && progress < 100 && (
                <Progress value={progress} className="w-full" />
              )}
            </div>
          )}

          <div className="mt-6 border-t pt-6">
            <p className="mb-4 text-sm text-muted-foreground">
              Need to start over? Delete all uploaded listens and upload fresh data.
            </p>
            <Button
              variant="destructive"
              onClick={handleResetRequest}
              disabled={isBusy}
            >
              Delete All Data
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={isResetDialogOpen}
        title="Delete all uploaded data?"
        description="This will permanently delete all listening history records from your account. This action cannot be undone."
        confirmLabel="Delete All Data"
        cancelLabel="Cancel"
        onConfirm={handleConfirmReset}
        onCancel={handleCancelReset}
        confirmButtonVariant="destructive"
      />
    </div>
  )
}
