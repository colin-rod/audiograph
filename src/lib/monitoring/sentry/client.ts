'use client'

import {
  createSentryAuthHeader,
  createSentryStoreUrl,
  parseSentryDsn,
  type SentryDsnComponents,
} from './shared'

interface CaptureContext {
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

interface SentryEvent {
  event_id: string
  timestamp: string
  level: 'error' | 'warning' | 'info'
  platform: 'javascript'
  environment?: string
  release?: string
  message?: { formatted: string }
  exception?: {
    values: Array<{
      type?: string
      value: string
      stacktrace?: {
        frames: Array<{
          filename: string
          function?: string
          lineno?: number
          colno?: number
        }>
      }
    }>
  }
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || ''
const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV
const SENTRY_RELEASE = process.env.NEXT_PUBLIC_SENTRY_RELEASE

let cachedDsn: SentryDsnComponents | null | undefined
let globalHandlersRegistered = false
let windowErrorHandler: ((event: ErrorEvent) => void) | null = null
let windowRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null

function getDsn(): SentryDsnComponents | null {
  if (cachedDsn !== undefined) {
    return cachedDsn
  }

  cachedDsn = SENTRY_DSN ? parseSentryDsn(SENTRY_DSN) : null
  return cachedDsn
}

function buildStacktrace(error: Error) {
  const stack = error.stack
  if (!stack) {
    return undefined
  }

  const lines = stack.split('\n').slice(1)
  const frames = lines
    .map((line) => line.trim())
    .map((line) => {
      const withFunctionMatch = line.match(/^at\s+([^\s].*?)\s+\((.+):(\d+):(\d+)\)$/)
      if (withFunctionMatch) {
        const [, func, file, lineNo, colNo] = withFunctionMatch
        return {
          filename: file,
          function: func,
          lineno: Number(lineNo),
          colno: Number(colNo),
        }
      }

      const noFunctionMatch = line.match(/^at\s+(.*):(\d+):(\d+)$/)
      if (noFunctionMatch) {
        const [, file, lineNo, colNo] = noFunctionMatch
        return {
          filename: file,
          lineno: Number(lineNo),
          colno: Number(colNo),
        }
      }

      return undefined
    })
    .filter((frame): frame is NonNullable<typeof frame> => Boolean(frame))

  if (frames.length === 0) {
    return undefined
  }

  return {
    frames: frames.reverse(),
  }
}

function normaliseError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'string') {
    return new Error(error)
  }

  return new Error('Unknown error')
}

async function sendEvent(payload: SentryEvent) {
  const dsn = getDsn()
  if (!dsn) {
    return
  }

  const endpoint = createSentryStoreUrl(dsn)
  const authHeader = createSentryAuthHeader(dsn, 'audiograph-client/1.0')

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': authHeader,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch (transportError) {
    console.error('Failed to send Sentry client event', transportError)
  }
}

export async function captureClientException(
  error: unknown,
  context: CaptureContext = {}
) {
  const dsn = getDsn()
  if (!dsn) {
    return
  }

  const normalisedError = normaliseError(error)
  const event: SentryEvent = {
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    level: 'error',
    platform: 'javascript',
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    message: { formatted: normalisedError.message },
    exception: {
      values: [
        {
          type: normalisedError.name,
          value: normalisedError.message,
          stacktrace: buildStacktrace(normalisedError),
        },
      ],
    },
    tags: context.tags,
    extra: context.extra,
  }

  await sendEvent(event)
}

export async function captureClientMessage(
  message: string,
  context: CaptureContext = {}
) {
  const dsn = getDsn()
  if (!dsn) {
    return
  }

  const event: SentryEvent = {
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    level: 'info',
    platform: 'javascript',
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    message: { formatted: message },
    tags: context.tags,
    extra: context.extra,
  }

  await sendEvent(event)
}

export function registerClientExceptionHandlers() {
  if (globalHandlersRegistered || !getDsn()) {
    return
  }

  windowErrorHandler = (event: ErrorEvent) => {
    void captureClientException(event.error ?? new Error(event.message), {
      tags: { mechanism: 'window_error' },
      extra: {
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  }

  windowRejectionHandler = (event: PromiseRejectionEvent) => {
    void captureClientException(event.reason, {
      tags: { mechanism: 'unhandledrejection' },
    })
  }

  window.addEventListener('error', windowErrorHandler)
  window.addEventListener('unhandledrejection', windowRejectionHandler)

  globalHandlersRegistered = true
}

export function unregisterClientExceptionHandlers() {
  if (!globalHandlersRegistered || !getDsn()) {
    return
  }

  if (windowErrorHandler) {
    window.removeEventListener('error', windowErrorHandler)
    windowErrorHandler = null
  }

  if (windowRejectionHandler) {
    window.removeEventListener('unhandledrejection', windowRejectionHandler)
    windowRejectionHandler = null
  }

  globalHandlersRegistered = false
}
