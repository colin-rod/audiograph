'use client'

import { useState } from 'react'

import { capturePostHogEvent } from '@/lib/monitoring/posthog/client'

export default function TestPostHogPage() {
  const [status, setStatus] = useState<string>('')

  const testPageView = () => {
    setStatus('PageView is tracked automatically when you navigate pages')
  }

  const testCustomEvent = () => {
    setStatus('Sending custom event...')
    capturePostHogEvent('test_custom_event', {
      test: true,
      timestamp: Date.now(),
      source: 'test_page',
    })
    setStatus('✓ Custom event sent: test_custom_event')
  }

  const testButtonClick = () => {
    setStatus('Sending button click event...')
    capturePostHogEvent('button_clicked', {
      button_name: 'test_button',
      page: '/test-posthog',
      clicked_at: new Date().toISOString(),
    })
    setStatus('✓ Button click event sent')
  }

  const testUserAction = () => {
    setStatus('Sending user action event...')
    capturePostHogEvent('user_action', {
      action_type: 'feature_test',
      feature_name: 'posthog_integration',
      success: true,
    })
    setStatus('✓ User action event sent')
  }

  const testErrorEvent = () => {
    setStatus('Sending error event...')
    capturePostHogEvent('test_error', {
      error_type: 'test_error',
      error_message: 'This is a test error from PostHog test page',
      severity: 'low',
    })
    setStatus('✓ Error event sent')
  }

  const testWithProperties = () => {
    setStatus('Sending event with rich properties...')
    capturePostHogEvent('rich_event_test', {
      string_prop: 'Hello PostHog',
      number_prop: 42,
      boolean_prop: true,
      array_prop: ['a', 'b', 'c'],
      object_prop: {
        nested: 'value',
        count: 123,
      },
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      screen_size: `${window.innerWidth}x${window.innerHeight}`,
    })
    setStatus('✓ Event with rich properties sent')
  }

  return (
    <div className="container mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-3xl font-bold">PostHog Integration Test</h1>

      <div className="mb-8 rounded-lg border border-blue-500 bg-blue-50 p-4 dark:bg-blue-950">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Make sure NEXT_PUBLIC_POSTHOG_KEY and
          NEXT_PUBLIC_POSTHOG_HOST are configured in your environment variables.
        </p>
      </div>

      {status && (
        <div className="mb-6 rounded-lg border bg-gray-50 p-4 dark:bg-gray-900">
          <p className="font-mono text-sm">{status}</p>
        </div>
      )}

      <div className="space-y-4">
        <section>
          <h2 className="mb-3 text-xl font-semibold">Event Tests</h2>
          <div className="grid gap-2">
            <button
              onClick={testPageView}
              className="rounded-lg border bg-purple-500 px-4 py-2 text-left text-white hover:bg-purple-600"
            >
              <div className="font-semibold">Automatic PageView</div>
              <div className="text-xs opacity-90">
                PageViews are tracked automatically when you navigate
              </div>
            </button>

            <button
              onClick={testCustomEvent}
              className="rounded-lg border bg-blue-500 px-4 py-2 text-left text-white hover:bg-blue-600"
            >
              <div className="font-semibold">Test Custom Event</div>
              <div className="text-xs opacity-90">
                Event: test_custom_event
              </div>
            </button>

            <button
              onClick={testButtonClick}
              className="rounded-lg border bg-green-500 px-4 py-2 text-left text-white hover:bg-green-600"
            >
              <div className="font-semibold">Test Button Click</div>
              <div className="text-xs opacity-90">Event: button_clicked</div>
            </button>

            <button
              onClick={testUserAction}
              className="rounded-lg border bg-indigo-500 px-4 py-2 text-left text-white hover:bg-indigo-600"
            >
              <div className="font-semibold">Test User Action</div>
              <div className="text-xs opacity-90">Event: user_action</div>
            </button>

            <button
              onClick={testErrorEvent}
              className="rounded-lg border bg-red-500 px-4 py-2 text-left text-white hover:bg-red-600"
            >
              <div className="font-semibold">Test Error Event</div>
              <div className="text-xs opacity-90">Event: test_error</div>
            </button>

            <button
              onClick={testWithProperties}
              className="rounded-lg border bg-orange-500 px-4 py-2 text-left text-white hover:bg-orange-600"
            >
              <div className="font-semibold">Test Rich Properties</div>
              <div className="text-xs opacity-90">
                Event with nested objects and arrays
              </div>
            </button>
          </div>
        </section>
      </div>

      <div className="mt-8 rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">How to Verify:</h3>
        <ol className="list-inside list-decimal space-y-1 text-sm">
          <li>Open browser DevTools (Network tab)</li>
          <li>Click any test button above</li>
          <li>
            Look for POST requests to{' '}
            <code className="rounded bg-gray-200 px-1 dark:bg-gray-800">
              /api/posthog-proxy
            </code>
          </li>
          <li>Check the Console tab for debug logs</li>
          <li>
            Check your PostHog dashboard at{' '}
            <a
              href="https://app.posthog.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              app.posthog.com
            </a>
          </li>
          <li>
            Go to Activity → Events to see real-time events
          </li>
        </ol>
      </div>

      <div className="mt-4 rounded-lg border border-green-500 bg-green-50 p-4 dark:bg-green-950">
        <h3 className="mb-2 font-semibold text-green-800 dark:text-green-200">
          ✓ Ad Blocker Bypass Enabled
        </h3>
        <p className="text-sm text-green-700 dark:text-green-300">
          Events are routed through /api/posthog-proxy to bypass ad blockers
          and CORS restrictions. This works even with ad blockers enabled!
        </p>
      </div>
    </div>
  )
}
