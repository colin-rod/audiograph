'use client'

import { useState } from 'react'

import {
  captureClientException,
  captureClientMessage,
} from '@/lib/monitoring/sentry/client'

export default function TestSentryPage() {
  const [status, setStatus] = useState<string>('')

  const testClientException = async () => {
    setStatus('Sending client exception...')
    try {
      await captureClientException(new Error('Test exception from client'), {
        tags: { test: 'true', type: 'manual' },
        extra: {
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
        },
      })
      setStatus('✓ Client exception sent')
    } catch (error) {
      setStatus(`✗ Failed: ${error}`)
    }
  }

  const testClientMessage = async () => {
    setStatus('Sending client message...')
    try {
      await captureClientMessage('Test message from client', {
        tags: { test: 'true' },
        extra: { timestamp: Date.now() },
      })
      setStatus('✓ Client message sent')
    } catch (error) {
      setStatus(`✗ Failed: ${error}`)
    }
  }

  const testUnhandledError = () => {
    setStatus('Throwing unhandled error...')
    setTimeout(() => {
      throw new Error('Unhandled error test from client')
    }, 100)
  }

  const testPromiseRejection = () => {
    setStatus('Creating unhandled promise rejection...')
    setTimeout(() => {
      Promise.reject(new Error('Unhandled promise rejection test'))
    }, 100)
  }

  const testServerException = async () => {
    setStatus('Triggering server exception...')
    try {
      const response = await fetch('/api/test-sentry?type=exception')
      const data = await response.json()
      setStatus(`✓ ${data.message}`)
    } catch (error) {
      setStatus(`✗ Failed: ${error}`)
    }
  }

  const testServerMessage = async () => {
    setStatus('Triggering server message...')
    try {
      const response = await fetch('/api/test-sentry?type=message')
      const data = await response.json()
      setStatus(`✓ ${data.message}`)
    } catch (error) {
      setStatus(`✗ Failed: ${error}`)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Sentry Integration Test</h1>

      <div className="mb-8 rounded-lg border border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-950">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> Make sure NEXT_PUBLIC_SENTRY_DSN is configured
          in your environment variables. Check the network tab to see requests
          being sent to Sentry.
        </p>
      </div>

      {status && (
        <div className="mb-6 rounded-lg border bg-gray-50 p-4 dark:bg-gray-900">
          <p className="font-mono text-sm">{status}</p>
        </div>
      )}

      <div className="space-y-4">
        <section>
          <h2 className="mb-3 text-xl font-semibold">Client-Side Tests</h2>
          <div className="grid gap-2">
            <button
              onClick={testClientException}
              className="rounded-lg border bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Test Client Exception
            </button>
            <button
              onClick={testClientMessage}
              className="rounded-lg border bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Test Client Message
            </button>
            <button
              onClick={testUnhandledError}
              className="rounded-lg border bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
            >
              Test Unhandled Error (check console)
            </button>
            <button
              onClick={testPromiseRejection}
              className="rounded-lg border bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
            >
              Test Promise Rejection (check console)
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Server-Side Tests</h2>
          <div className="grid gap-2">
            <button
              onClick={testServerException}
              className="rounded-lg border bg-green-500 px-4 py-2 text-white hover:bg-green-600"
            >
              Test Server Exception
            </button>
            <button
              onClick={testServerMessage}
              className="rounded-lg border bg-green-500 px-4 py-2 text-white hover:bg-green-600"
            >
              Test Server Message
            </button>
          </div>
        </section>
      </div>

      <div className="mt-8 rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">How to Verify:</h3>
        <ol className="list-inside list-decimal space-y-1 text-sm">
          <li>Open browser DevTools (Network tab)</li>
          <li>Click any test button above</li>
          <li>Look for POST requests to your Sentry endpoint</li>
          <li>Check Sentry dashboard for events</li>
          <li>For unhandled errors, also check the Console tab</li>
        </ol>
      </div>
    </div>
  )
}
