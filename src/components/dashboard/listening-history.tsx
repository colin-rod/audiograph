"use client"

import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { createSupabaseBrowserClient } from "@/lib/supabaseClient"
import { getListeningHistory } from "@/lib/analytics-service"
import type { TimeframeFilter } from "@/lib/analytics-types"
import { timeframeToParams } from "@/lib/analytics-types"

export type ListeningHistoryEntry = {
  track: string | null
  artist: string | null
  ts: string | null
  ms_played: number | null
}

type ListeningHistoryProps = {
  timeframeFilter: TimeframeFilter
  className?: string
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})

const formatDuration = (ms: number | null) => {
  if (!ms || ms <= 0) {
    return "—"
  }

  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) {
    return `${seconds}s`
  }

  if (seconds === 0) {
    return `${minutes}m`
  }

  return `${minutes}m ${seconds}s`
}

const parseDateTimeInput = (value: string): Date | null => {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const PAGE_SIZE = 50

function ListeningHistory({ timeframeFilter, className }: ListeningHistoryProps) {
  const [query, setQuery] = useState("")
  const [fromValue, setFromValue] = useState("")
  const [toValue, setToValue] = useState("")
  const [listens, setListens] = useState<ListeningHistoryEntry[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthReady, setIsAuthReady] = useState(false)

  const fromDate = useMemo(() => parseDateTimeInput(fromValue), [fromValue])
  const toDate = useMemo(() => parseDateTimeInput(toValue), [toValue])
  const isRangeInvalid = Boolean(
    fromDate && toDate && fromDate.getTime() > toDate.getTime()
  )

  // Check authentication status
  useEffect(() => {
    let active = true
    const supabase = createSupabaseBrowserClient()

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (active) {
        setIsAuthReady(!!session)
      }
    }

    void checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setIsAuthReady(!!session)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // Fetch data when filters change
  useEffect(() => {
    let active = true
    const supabase = createSupabaseBrowserClient()

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      const timeParams = timeframeToParams(timeframeFilter)
      const result = await getListeningHistory(supabase, {
        search_query: query.trim() || null,
        start_date: fromDate?.toISOString() ?? timeParams.start_date,
        end_date: toDate?.toISOString() ?? timeParams.end_date,
        limit_count: PAGE_SIZE,
        offset_count: currentPage * PAGE_SIZE,
      })

      if (!active) return

      setIsLoading(false)

      if (!result.success) {
        setError(result.error.message)
        console.error('[ListeningHistory] Error:', result.error)
        return
      }

      setListens(result.data.data)
      setTotalCount(result.data.totalCount)
    }

    // Only fetch if authenticated and range is valid
    if (isAuthReady && !isRangeInvalid) {
      void fetchData()
    } else if (!isAuthReady) {
      setIsLoading(false)
      setError(null)
    }

    return () => {
      active = false
    }
  }, [timeframeFilter, query, fromDate, toDate, currentPage, isRangeInvalid, isAuthReady])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0)
  }, [timeframeFilter, query, fromDate, toDate])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasNextPage = currentPage < totalPages - 1
  const hasPrevPage = currentPage > 0

  const displayListens = useMemo(() => {
    if (isRangeInvalid) {
      return []
    }
    return listens
  }, [listens, isRangeInvalid])

  return (
    <Card className={cn("shadow-none", className)}>
      <CardHeader>
        <CardTitle role="heading" aria-level={3}>
          Search your listening history
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Look up a song or artist to see when it played, or narrow results to a
          specific moment in time.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            <label htmlFor="listening-history-search" className="text-sm font-medium">
              Search songs or artists
            </label>
            <Input
              id="listening-history-search"
              placeholder="Try a song title, artist, or both"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="listening-history-from" className="text-sm font-medium">
              From
            </label>
            <Input
              id="listening-history-from"
              type="datetime-local"
              value={fromValue}
              onChange={(event) => setFromValue(event.target.value)}
              aria-invalid={isRangeInvalid}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="listening-history-to" className="text-sm font-medium">
              To
            </label>
            <Input
              id="listening-history-to"
              type="datetime-local"
              value={toValue}
              onChange={(event) => setToValue(event.target.value)}
              aria-invalid={isRangeInvalid}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Times are shown in your local timezone.
        </p>
        {isRangeInvalid ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            The start of your range must be before the end time.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading ? (
                "Loading..."
              ) : (
                <>
                  Showing {displayListens.length} of {totalCount}{" "}
                  {totalCount === 1 ? "play" : "plays"}
                  {currentPage > 0 && ` (page ${currentPage + 1} of ${totalPages})`}
                </>
              )}
            </p>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={!hasPrevPage || isLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={!hasNextPage || isLoading}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
          <Table aria-label="Listening history results">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Track</TableHead>
                <TableHead scope="col">Artist</TableHead>
                <TableHead scope="col">Listened at</TableHead>
                <TableHead scope="col" className="text-right">
                  Duration
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayListens.length ? (
                displayListens.map((listen, index) => {
                  const timestamp = listen.ts ? new Date(listen.ts) : null
                  const formattedTimestamp =
                    timestamp && !Number.isNaN(timestamp.getTime())
                      ? dateTimeFormatter.format(timestamp)
                      : "Unknown"

                  return (
                    <TableRow key={`${listen.track ?? "unknown"}-${listen.ts ?? index}`}>
                      <TableCell>{listen.track ?? "Unknown track"}</TableCell>
                      <TableCell>{listen.artist ?? "—"}</TableCell>
                      <TableCell>{formattedTimestamp}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatDuration(listen.ms_played)}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    {listens.length
                      ? "No plays match your current filters. Try broadening your search or removing the time range."
                      : "Once you import your listens, we'll display them here for quick searching."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function ListeningHistorySkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-busy
      data-testid="listening-history-skeleton"
      className={cn("shadow-none", className)}
    >
      <CardHeader>
        <Skeleton className="h-5 w-60" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </CardContent>
    </Card>
  )
}

export { ListeningHistory, ListeningHistorySkeleton }
