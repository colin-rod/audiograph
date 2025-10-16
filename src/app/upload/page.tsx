'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

type ZipEntryMetadata = {
  name: string
  compressionMethod: number
  compressedSize: number
  localHeaderOffset: number
}

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50
const ZIP_CENTRAL_DIRECTORY_HEADER_SIGNATURE = 0x02014b50
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50
const ZIP_EOCD_SEARCH_RANGE = 0xffff + 22

const textDecoder = new TextDecoder()

const findEndOfCentralDirectory = (view: DataView) => {
  const minimumOffset = Math.max(0, view.byteLength - ZIP_EOCD_SEARCH_RANGE)

  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset
    }
  }

  return null
}

const parseCentralDirectoryEntries = (
  view: DataView,
  buffer: ArrayBuffer,
  offset: number,
  count: number,
) => {
  const entries: ZipEntryMetadata[] = []
  let cursor = offset

  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(cursor, true) !== ZIP_CENTRAL_DIRECTORY_HEADER_SIGNATURE) {
      throw new Error('ZIP_INVALID_CENTRAL_DIRECTORY')
    }

    const compressionMethod = view.getUint16(cursor + 10, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const localHeaderOffset = view.getUint32(cursor + 42, true)
    const fileNameLength = view.getUint16(cursor + 28, true)
    const extraFieldLength = view.getUint16(cursor + 30, true)
    const fileCommentLength = view.getUint16(cursor + 32, true)

    const nameBytes = new Uint8Array(buffer, cursor + 46, fileNameLength)
    const name = textDecoder.decode(nameBytes)

    entries.push({ name, compressionMethod, compressedSize, localHeaderOffset })

    cursor += 46 + fileNameLength + extraFieldLength + fileCommentLength
  }

  return entries
}

const readZipEntryData = (
  entry: ZipEntryMetadata,
  view: DataView,
  buffer: ArrayBuffer,
) => {
  const signature = view.getUint32(entry.localHeaderOffset, true)
  if (signature !== ZIP_LOCAL_FILE_HEADER_SIGNATURE) {
    throw new Error('ZIP_INVALID_LOCAL_HEADER')
  }

  const fileNameLength = view.getUint16(entry.localHeaderOffset + 26, true)
  const extraFieldLength = view.getUint16(entry.localHeaderOffset + 28, true)
  const dataOffset = entry.localHeaderOffset + 30 + fileNameLength + extraFieldLength

  return new Uint8Array(buffer, dataOffset, entry.compressedSize)
}

const decompressDeflateRaw = async (data: Uint8Array) => {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('ZIP_DECOMPRESSION_UNSUPPORTED')
  }

  const stream = new Blob([data])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  const arrayBuffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

const readZipJsonFiles = async (file: File) => {
  const buffer = await file.arrayBuffer()
  const view = new DataView(buffer)
  const endOfCentralDirectoryOffset = findEndOfCentralDirectory(view)

  if (endOfCentralDirectoryOffset === null) {
    throw new Error('ZIP_END_OF_CENTRAL_DIRECTORY_NOT_FOUND')
  }

  const centralDirectoryOffset = view.getUint32(endOfCentralDirectoryOffset + 16, true)
  const totalEntries = view.getUint16(endOfCentralDirectoryOffset + 10, true)
  const entries = parseCentralDirectoryEntries(
    view,
    buffer,
    centralDirectoryOffset,
    totalEntries,
  )

  const sortedJsonEntries = entries
    .filter((entry) => entry.compressedSize > 0 || entry.compressionMethod === 0)
    .filter((entry) => !entry.name.endsWith('/'))
    .filter((entry) => entry.name.toLowerCase().endsWith('.json'))
    .sort((a, b) => a.name.localeCompare(b.name))

  const files: { name: string; text: string }[] = []

  for (const entry of sortedJsonEntries) {
    try {
      const rawData = readZipEntryData(entry, view, buffer)
      let decoded: Uint8Array

      if (entry.compressionMethod === 0) {
        decoded = rawData
      } else if (entry.compressionMethod === 8) {
        decoded = await decompressDeflateRaw(rawData)
      } else {
        console.warn(
          `Skipping ${entry.name} due to unsupported compression method ${entry.compressionMethod}.`,
        )
        continue
      }

      const text = textDecoder.decode(decoded)
      files.push({ name: entry.name, text })
    } catch (error) {
      console.error('Failed to read ZIP entry', entry.name, error)
    }
  }

  return files
}

const parseListenRowsFromArray = (values: unknown[]) =>
  values
    .map(toSpotifyHistoryEntry)
    .filter((entry): entry is SpotifyHistoryEntry => entry !== null)
    .map(toListenInsert)
    .filter((row): row is ListenInsert => row !== null)

const parseListenRowsFromUnknown = (value: unknown): ListenInsert[] => {
  if (Array.isArray(value)) {
    return parseListenRowsFromArray(value)
  }

  if (isRecord(value)) {
    const collected: ListenInsert[] = []

    for (const nested of Object.values(value)) {
      if (Array.isArray(nested)) {
        collected.push(...parseListenRowsFromArray(nested))
      } else if (isRecord(nested)) {
        collected.push(...parseListenRowsFromUnknown(nested))
      }
    }

    return collected
  }

  return []
}

const dedupeListenRows = (rows: ListenInsert[]) => {
  const uniqueRows = new Map<string, ListenInsert>()

  rows.forEach((row) => {
    const timestampKey =
      row.ts instanceof Date
        ? Number.isNaN(row.ts.getTime())
          ? 'NaN'
          : row.ts.toISOString()
        : ''
    const key = [
      timestampKey,
      row.track ?? '',
      row.artist ?? '',
      row.ms_played === null ? '' : row.ms_played.toString(),
    ].join('|')

    if (!uniqueRows.has(key)) {
      uniqueRows.set(key, row)
    }
  })

  return Array.from(uniqueRows.values())
}

type UploadDropzoneProps = {
  onFilesAccepted: (files: File[]) => void
  isBusy: boolean
  currentFile: File | null
  queuedFiles: File[]
}

function UploadDropzone({
  onFilesAccepted,
  isBusy,
  currentFile,
  queuedFiles,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const queueSize = queuedFiles.length
  const activeFile = currentFile ?? (queueSize > 0 ? queuedFiles[0] : null)
  const remainingCount = currentFile
    ? Math.max(queueSize - 1, 0)
    : activeFile
    ? Math.max(queueSize - 1, 0)
    : 0

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

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        id="spotify-upload"
        type="file"
        multiple
        accept=".json,.zip,application/json,application/zip,application/x-zip-compressed"
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
          <p className="text-sm font-medium">
            Drag and drop your Spotify JSON or ZIP exports here
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            or click to choose files from your computer
          </p>
          {activeFile ? (
            <p className="mt-4 text-sm font-medium">
              {currentFile ? 'Processing' : 'Ready'}: {activeFile.name} ({formatFileSize(activeFile.size)})
            </p>
          ) : null}
          {remainingCount > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {remainingCount} additional file{remainingCount === 1 ? '' : 's'} in queue
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
          Choose Files
        </Button>
      </div>
    </div>
  )
}

export default function UploadPage() {
  const [status, setStatus] = useState<StatusState>({
    state: 'idle',
    message: 'Select a Spotify listening history JSON or ZIP export to begin.',
  })
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [fileQueue, setFileQueue] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const supabase = useMemo(() => createSupabaseClient(), [])

  const clearQueue = useCallback(() => {
    setFileQueue([])
    setCurrentFile(null)
    setIsProcessing(false)
    setProgress(0)
  }, [])

  const handleFilesAccepted = useCallback((files: File[]) => {
    if (files.length === 0) {
      return
    }
    setFileQueue((previous) => [...previous, ...files])
  }, [])

  const handleResetRequest = useCallback(() => {
    setIsResetDialogOpen(true)
  }, [])

  const handleCancelReset = useCallback(() => {
    setIsResetDialogOpen(false)
  }, [])

  const handleConfirmReset = useCallback(async () => {
    setIsResetDialogOpen(false)
    clearQueue()
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
        message: 'An unexpected error occurred while deleting data. Please try again.',
      })
    }
  }, [clearQueue, supabase])

  const processFile = useCallback(
    async (file: File) => {
      const stopWithError = (message: string) => {
        setStatus({ state: 'error', message })
        clearQueue()
      }

      try {
        setIsProcessing(true)
        setCurrentFile(file)
        setProgress(0)

        const lowerCaseName = file.name.toLowerCase()
        if (!lowerCaseName.endsWith('.json') && !lowerCaseName.endsWith('.zip')) {
          stopWithError(
            `${file.name} is not a supported file type. Please upload JSON or ZIP exports.`,
          )
          return
        }

        let rows: ListenInsert[] = []
        let processedSources = 0
        let sourceDescription = file.name

        if (lowerCaseName.endsWith('.zip')) {
          setStatus({ state: 'validating', message: `Inspecting ${file.name}…` })

          let zipFiles: { name: string; text: string }[]
          try {
            zipFiles = await readZipJsonFiles(file)
          } catch (error) {
            console.error(error)
            if (error instanceof Error && error.message === 'ZIP_DECOMPRESSION_UNSUPPORTED') {
              stopWithError(
                `${file.name} could not be extracted because your browser does not support ZIP extraction yet. Please upload the JSON files directly.`,
              )
            } else if (
              error instanceof Error &&
              error.message === 'ZIP_END_OF_CENTRAL_DIRECTORY_NOT_FOUND'
            ) {
              stopWithError(
                `${file.name} is missing required ZIP information. Please try again.`,
              )
            } else {
              stopWithError(`Unable to read the ZIP archive ${file.name}. Please try again.`)
            }
            return
          }

          if (zipFiles.length === 0) {
            stopWithError(`No JSON files were found in ${file.name}.`)
            return
          }

          for (const zipFile of zipFiles) {
            try {
              const parsed = JSON.parse(zipFile.text)
              const extracted = parseListenRowsFromUnknown(parsed)
              if (extracted.length > 0) {
                rows = rows.concat(extracted)
                processedSources += 1
              }
            } catch (error) {
              console.error(`Failed to parse ${zipFile.name} from archive`, error)
            }
          }

          if (processedSources === 0) {
            stopWithError(`No valid listening records were found in ${file.name}.`)
            return
          }

          sourceDescription = `${processedSources} Spotify JSON ${
            processedSources === 1 ? 'file' : 'files'
          } in ${file.name}`
        } else {
          setStatus({ state: 'validating', message: `Validating ${file.name}…` })

          let text: string
          try {
            text = await file.text()
          } catch (error) {
            console.error(error)
            stopWithError(`Unable to read ${file.name}. Please try again.`)
            return
          }

          let parsed: unknown
          try {
            parsed = JSON.parse(text)
          } catch (error) {
            console.error(error)
            stopWithError(`${file.name} does not contain valid JSON.`)
            return
          }

          rows = parseListenRowsFromUnknown(parsed)

          if (rows.length === 0) {
            stopWithError(`No valid listening records were found in ${file.name}.`)
            return
          }

          processedSources = 1
        }

        const uniqueRows = dedupeListenRows(rows)

        if (uniqueRows.length === 0) {
          stopWithError(
            `No valid listening records were found after removing duplicates in ${sourceDescription}.`,
          )
          return
        }

        const hasTimestamp = uniqueRows.some(
          (row) => row.ts instanceof Date && !Number.isNaN(row.ts.getTime()),
        )

        if (!hasTimestamp) {
          stopWithError(`No timestamp information found in ${sourceDescription}.`)
          return
        }

        setStatus({
          state: 'uploading',
          message: `Uploading ${uniqueRows.length} records from ${sourceDescription}…`,
        })

        for (let index = 0; index < uniqueRows.length; index += BATCH_SIZE) {
          const batch = uniqueRows.slice(index, index + BATCH_SIZE)
          const { error } = await supabase.from('listens').insert(batch)

          if (error) {
            console.error(error)
            stopWithError(
              `Supabase returned an error while uploading records from ${sourceDescription}. Please try again.`,
            )
            return
          }

          const uploadedCount = Math.min(index + batch.length, uniqueRows.length)
          const percent = Math.round((uploadedCount / uniqueRows.length) * 100)
          setProgress(percent)
        }

        setProgress(100)
        setStatus({
          state: 'success',
          message: `Successfully uploaded ${uniqueRows.length} listening records from ${sourceDescription}.`,
        })

        setFileQueue((previous) => previous.slice(1))
        setCurrentFile(null)
        setIsProcessing(false)
      } catch (error) {
        console.error(error)
        stopWithError(
          `An unexpected error occurred while processing ${file.name}. Please try again.`,
        )
      }
    },
    [clearQueue, supabase],
  )

  useEffect(() => {
    if (isProcessing) {
      return
    }

    if (fileQueue.length === 0) {
      return
    }

    void processFile(fileQueue[0])
  }, [fileQueue, isProcessing, processFile])

  return (
    <Card className="mx-auto mt-12 max-w-xl space-y-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Upload your Spotify Listening History</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Drag in the JSON or ZIP exports downloaded from Spotify to add them to Supabase.
        </p>
      </div>
      <UploadDropzone
        onFilesAccepted={handleFilesAccepted}
        isBusy={
          status.state === 'validating' ||
          status.state === 'uploading' ||
          status.state === 'resetting'
        }
        currentFile={currentFile}
        queuedFiles={fileQueue}
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
