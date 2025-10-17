import { NextRequest, NextResponse } from 'next/server'

import {
  createSentryAuthHeader,
  createSentryStoreUrl,
  parseSentryDsn,
} from '@/lib/monitoring/sentry/shared'

export async function POST(request: NextRequest) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

  if (!dsn) {
    return NextResponse.json({ error: 'Sentry DSN not configured' }, { status: 500 })
  }

  const dsnComponents = parseSentryDsn(dsn)
  if (!dsnComponents) {
    return NextResponse.json({ error: 'Invalid Sentry DSN' }, { status: 500 })
  }

  try {
    // Read the envelope body from the request
    const body = await request.text()

    const endpoint = createSentryStoreUrl(dsnComponents)
    const authHeader = createSentryAuthHeader(dsnComponents, 'audiograph-proxy/1.0')

    // Forward the request to Sentry
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': authHeader,
      },
      body,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Sentry proxy error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to forward to Sentry', details: errorText },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Sentry proxy exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
