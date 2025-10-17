import { NextResponse } from 'next/server'

import {
  captureServerException,
  captureServerMessage,
} from '@/lib/monitoring/sentry/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'exception'

  try {
    switch (type) {
      case 'exception':
        await captureServerException(new Error('Test exception from server'), {
          tags: { test: 'true', type: 'manual' },
          extra: {
            timestamp: Date.now(),
            userAgent: request.headers.get('user-agent'),
          },
        })
        return NextResponse.json({
          success: true,
          message: 'Test exception sent to Sentry',
        })

      case 'message':
        await captureServerMessage('Test message from server', {
          tags: { test: 'true', type: 'manual' },
          extra: { timestamp: Date.now() },
        })
        return NextResponse.json({
          success: true,
          message: 'Test message sent to Sentry',
        })

      case 'throw':
        // This will be caught by the error boundary
        throw new Error('Uncaught test exception')

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Use: exception, message, or throw' },
          { status: 400 }
        )
    }
  } catch (error) {
    // Re-throw to let Next.js handle it
    throw error
  }
}
