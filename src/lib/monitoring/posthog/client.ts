'use client'

import type { ReadonlyURLSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
const DISTINCT_ID_STORAGE_KEY = 'audiograph.posthog.distinctId'

let distinctId: string | null = null
let initialised = false

function generateDistinctId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function readDistinctId() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = window.localStorage.getItem(DISTINCT_ID_STORAGE_KEY)
    if (stored) {
      return stored
    }
  } catch {
    // localStorage might be unavailable, fall back to in-memory id
  }

  const newId = generateDistinctId()

  try {
    window.localStorage.setItem(DISTINCT_ID_STORAGE_KEY, newId)
  } catch {
    // Ignore storage errors
  }

  return newId
}

export function initPostHog() {
  if (initialised || !POSTHOG_KEY) {
    return initialised
  }

  distinctId = readDistinctId()
  initialised = Boolean(distinctId)

  return initialised
}

interface PostHogEventPayload {
  event: string
  properties?: Record<string, unknown>
  timestamp?: string
}

async function sendEvent({ event, properties, timestamp }: PostHogEventPayload) {
  if (!POSTHOG_KEY) {
    console.warn('[PostHog] API key not configured')
    return
  }

  if (!distinctId) {
    console.warn('[PostHog] No distinct ID available')
    return
  }

  const endpoint = `${POSTHOG_HOST.replace(/\/$/, '')}/capture/`
  const payload = {
    api_key: POSTHOG_KEY,
    event,
    properties: {
      distinct_id: distinctId,
      $current_url: typeof window !== 'undefined' ? window.location.href : undefined,
      ...properties,
    },
    timestamp: timestamp ?? new Date().toISOString(),
    sent_at: new Date().toISOString(),
  }

  console.log('[PostHog Debug] Sending event:', event)
  console.log('[PostHog Debug] Endpoint:', endpoint)
  console.log('[PostHog Debug] Properties:', properties)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })

    console.log('[PostHog Debug] Response status:', response.status)

    if (!response.ok) {
      const responseText = await response.text()
      console.error('[PostHog Debug] Response error:', responseText)
    } else {
      console.log('[PostHog Debug] Event sent successfully')
    }
  } catch (error) {
    console.error('Failed to send PostHog event', error)
  }
}

export function capturePostHogEvent(event: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) {
    return
  }

  if (!initialised) {
    initPostHog()
  }

  void sendEvent({ event, properties })
}

export function usePostHogPageview(
  pathname: string,
  searchParams: URLSearchParams | ReadonlyURLSearchParams | null
) {
  const previousRef = useRef<string>('')

  useEffect(() => {
    if (!POSTHOG_KEY) {
      return
    }

    if (!initialised) {
      initPostHog()
    }

    const search = searchParams ? `?${searchParams.toString()}` : ''
    const identifier = `${pathname}${search}`

    if (previousRef.current === identifier) {
      return
    }

    previousRef.current = identifier
    void sendEvent({
      event: '$pageview',
      properties: {
        $pathname: pathname,
        $current_url:
          typeof window !== 'undefined' ? `${window.location.origin}${identifier}` : identifier,
      },
    })
  }, [pathname, searchParams])
}
