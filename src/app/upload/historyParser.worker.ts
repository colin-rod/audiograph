import {
  dedupeListenInserts,
  hasValidTimestamp,
  ListenInsert,
  toListenInsert,
  toSpotifyHistoryEntry,
} from './spotify-parser'

const workerScope = self as unknown as DedicatedWorkerGlobalScope

type ParseMessage = {
  type: 'parse'
  file: File
}

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

type WorkerResponse =
  | WorkerStatusMessage
  | WorkerSuccessMessage
  | WorkerErrorMessage

const postWorkerMessage = (message: WorkerResponse) => {
  workerScope.postMessage(message)
}

const parseFile = async (file: File) => {
  postWorkerMessage({ type: 'status', message: 'Reading file…' })
  const text = await file.text()

  postWorkerMessage({ type: 'status', message: 'Parsing JSON…' })
  const parsed = JSON.parse(text)

  if (!Array.isArray(parsed)) {
    throw new Error('Expected an array of listening records in the JSON file.')
  }

  postWorkerMessage({ type: 'status', message: 'Processing entries…' })

  const parsedRows = parsed
    .map(toSpotifyHistoryEntry)
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .map(toListenInsert)
    .filter((row): row is NonNullable<typeof row> => row !== null)

  const rows = dedupeListenInserts(parsedRows)

  if (rows.length === 0) {
    throw new Error('No valid listening records were found in the file.')
  }

  if (!hasValidTimestamp(rows)) {
    throw new Error('No timestamp information found in the uploaded file.')
  }

  return rows
}

workerScope.addEventListener('message', async (event: MessageEvent<ParseMessage>) => {
  const { data } = event

  if (data?.type !== 'parse') {
    return
  }

  try {
    const rows = await parseFile(data.file)
    postWorkerMessage({ type: 'success', rows })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred while processing the file.'
    postWorkerMessage({ type: 'error', message })
  }
})

export {}
