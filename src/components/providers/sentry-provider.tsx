'use client'

import { useEffect } from 'react'

import {
  registerClientExceptionHandlers,
  unregisterClientExceptionHandlers,
} from '@/lib/monitoring/sentry/client'

interface Props {
  children: React.ReactNode
}

export function SentryProvider({ children }: Props) {
  useEffect(() => {
    registerClientExceptionHandlers()

    return () => {
      unregisterClientExceptionHandlers()
    }
  }, [])

  return <>{children}</>
}
