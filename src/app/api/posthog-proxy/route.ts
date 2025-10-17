import { NextRequest, NextResponse } from 'next/server'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

export async function POST(request: NextRequest) {
  if (!POSTHOG_KEY) {
    return NextResponse.json(
      { error: 'PostHog API key not configured' },
      { status: 500 }
    )
  }

  try {
    // Read the event payload from the request
    const body = await request.json()

    const endpoint = `${POSTHOG_HOST.replace(/\/$/, '')}/capture/`

    // Forward the request to PostHog
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        api_key: POSTHOG_KEY, // Add API key on the server side
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('PostHog proxy error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to forward to PostHog', details: errorText },
        { status: response.status }
      )
    }

    const responseData = await response.json()
    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error('PostHog proxy exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
