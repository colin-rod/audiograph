'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { initPostHog, usePostHogPageview } from '@/lib/monitoring/posthog/client'

interface Props {
  children: React.ReactNode
}

export function PostHogProvider({ children }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    initPostHog()
  }, [])

  usePostHogPageview(pathname, searchParams)

  return <>{children}</>
}
