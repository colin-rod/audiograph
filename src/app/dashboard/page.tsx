"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

export const dynamic = "force-dynamic"

import {
  DashboardSummary,
  DashboardSummarySkeleton,
  type DashboardStats,
} from "@/components/dashboard/dashboard-summary"
import { ListeningClockHeatmap, ListeningClockHeatmapSkeleton } from "@/components/dashboard/listening-clock-heatmap"
import { ListeningHistory, ListeningHistorySkeleton } from "@/components/dashboard/listening-history"
import { ListeningTrendsChart, ListeningTrendsChartSkeleton } from "@/components/dashboard/listening-trends-chart"
import { TopArtistsChart, TopArtistsChartSkeleton } from "@/components/dashboard/top-artists-chart"
import { TopTracksTable, TopTracksTableSkeleton } from "@/components/dashboard/top-tracks-table"
import { Button } from "@/components/ui/button"
import { createSupabaseBrowserClient } from "@/lib/supabaseClient"
import { createSupabaseClient } from "@/lib/supabaseClient"
import { useDashboardSectionTransition } from "@/components/dashboard/dashboard-motion"
import { ShareCardsDialog } from "@/components/dashboard/share-cards"

import {
  TimeframeFilter,
  type TimeframeMonthOption,
  type TimeframeOption,
  type TimeframeValue,
  type TimeframeYearOption,
} from "@/components/dashboard/timeframe-filter"

type ListenSummaryRow = {
  ms_played: number | null
  artist: string | null
  track: string | null
  ts: string | null
}

type DashboardErrorState = "unauthorized" | "error" | null

type DashboardStateMessageProps = {
  title: string
  description: string
  action?: {
    href: string
    label: string
  }
}

const DashboardStateMessage = ({
  title,
  description,
  action,
}: DashboardStateMessageProps) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-10 text-center">
    <div className="space-y-1">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
    </div>
    {action ? (
      <Button asChild>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    ) : null}
  </div>
)

const getPostgrestErrorStatus = (error: unknown): number | null => {
  if (typeof error !== "object" || error === null) {
    return null
  }

  if (!("status" in error)) {
    return null
  }

  const { status } = error as { status?: unknown }
  return typeof status === "number" ? status : null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const toListenSummaryRow = (value: unknown): ListenSummaryRow | null => {
  if (!isRecord(value)) {
    return null
  }

  const msPlayed =
    typeof value["ms_played"] === "number"
      ? (value["ms_played"] as number)
      : null
  const artist =
    typeof value["artist"] === "string"
      ? (value["artist"] as string)
      : null
  const track =
    typeof value["track"] === "string"
      ? (value["track"] as string)
      : null
  const rawTs = value["ts"]
  const ts =
    typeof rawTs === "string"
      ? rawTs
      : rawTs instanceof Date && !Number.isNaN(rawTs.getTime())
        ? rawTs.toISOString()
        : null

  return { ms_played: msPlayed, artist, track, ts }
}

const MS_PER_HOUR = 1000 * 60 * 60

const calculateDashboardStats = (listens: ListenSummaryRow[]): DashboardStats => {
  const totalMs = listens.reduce(
    (acc, listen) => acc + (listen.ms_played ?? 0),
    0
  )
  const totalHours = (totalMs / MS_PER_HOUR).toFixed(1)
  const artists = new Set(
    listens.map((listen) => listen.artist).filter(Boolean)
  ).size
  const tracks = new Set(
    listens.map((listen) => listen.track).filter(Boolean)
  ).size
  const artistPlaytime = new Map<string, number>()
  const yearlyPlaytime = new Map<string, number>()

  listens.forEach((listen) => {
    const msPlayed = listen.ms_played ?? 0

    if (listen.artist) {
      artistPlaytime.set(
        listen.artist,
        (artistPlaytime.get(listen.artist) ?? 0) + msPlayed
      )
    }

    if (listen.ts) {
      const tsDate = new Date(listen.ts)
      if (!Number.isNaN(tsDate.getTime())) {
        const year = tsDate.getUTCFullYear().toString()
        yearlyPlaytime.set(year, (yearlyPlaytime.get(year) ?? 0) + msPlayed)
      }
    }
  })

  const topArtistEntry = Array.from(artistPlaytime.entries()).sort(
    ([artistA, msA], [artistB, msB]) => {
      if (msA === msB) {
        return artistA.localeCompare(artistB)
      }
      return msB - msA
    }
  )[0]

  const mostActiveYearEntry = Array.from(yearlyPlaytime.entries()).sort(
    ([yearA, msA], [yearB, msB]) => {
      if (msA === msB) {
        return yearA.localeCompare(yearB)
      }
      return msB - msA
    }
  )[0]

  return {
    totalHours,
    artists,
    tracks,
    topArtist: topArtistEntry?.[0] ?? null,
    mostActiveYear: mostActiveYearEntry?.[0] ?? null,
  }
}

const calculateTopArtists = (listens: ListenSummaryRow[]) => {
  const artistTotals = new Map<string, number>()

  listens.forEach((listen) => {
    if (!listen.artist) return
    const msPlayed = listen.ms_played ?? 0
    artistTotals.set(listen.artist, (artistTotals.get(listen.artist) ?? 0) + msPlayed)
  })

  return Array.from(artistTotals.entries())
    .map(([name, ms]) => ({
      name,
      hours: Number((ms / MS_PER_HOUR).toFixed(1)),
    }))
    .sort((a, b) => {
      if (b.hours === a.hours) {
        return a.name.localeCompare(b.name)
      }
      return b.hours - a.hours
    })
    .slice(0, 5)
}

const calculateTopTracks = (listens: ListenSummaryRow[]) => {
  type TrackKey = {
    track: string
    artist: string | null
  }

  const trackTotals = new Map<string, { info: TrackKey; ms: number }>()

  listens.forEach((listen) => {
    if (!listen.track) return
    const msPlayed = listen.ms_played ?? 0
    const key = `${listen.track}__${listen.artist ?? ""}`
    const entry = trackTotals.get(key) ?? {
      info: { track: listen.track, artist: listen.artist ?? null },
      ms: 0,
    }
    entry.ms += msPlayed
    trackTotals.set(key, entry)
  })

  return Array.from(trackTotals.values())
    .map(({ info, ms }) => ({
      track: info.track,
      artist: info.artist,
      hours: Number((ms / MS_PER_HOUR).toFixed(1)),
    }))
    .sort((a, b) => {
      if (b.hours === a.hours) {
        return a.track.localeCompare(b.track)
      }
      return b.hours - a.hours
    })
    .slice(0, 5)
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
})

const calculateListeningTrends = (listens: ListenSummaryRow[]) => {
  const monthlyTotals = new Map<string, number>()

  listens.forEach((listen) => {
    if (!listen.ts) return
    const tsDate = new Date(listen.ts)
    if (Number.isNaN(tsDate.getTime())) return
    const year = tsDate.getUTCFullYear()
    const month = tsDate.getUTCMonth() + 1
    const key = `${year}-${String(month).padStart(2, "0")}`
    const msPlayed = listen.ms_played ?? 0
    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + msPlayed)
  })

  return Array.from(monthlyTotals.entries())
    .map(([month, ms]) => {
      const [yearStr, monthStr] = month.split("-")
      const year = Number(yearStr)
      const monthIndex = Number(monthStr) - 1
      const date = new Date(Date.UTC(year, monthIndex, 1))
      return {
        month,
        label: MONTH_LABEL_FORMATTER.format(date),
        hours: Number((ms / MS_PER_HOUR).toFixed(1)),
      }
    })
    .sort((a, b) => a.month.localeCompare(b.month))
}

const calculateListeningClock = (listens: ListenSummaryRow[]) => {
  const slotTotals = new Map<string, number>()

  listens.forEach((listen) => {
    if (!listen.ts) return
    const tsDate = new Date(listen.ts)
    if (Number.isNaN(tsDate.getTime())) return
    const day = tsDate.getUTCDay()
    const hour = tsDate.getUTCHours()
    const key = `${day}-${hour}`
    const msPlayed = listen.ms_played ?? 0
    slotTotals.set(key, (slotTotals.get(key) ?? 0) + msPlayed)
  })

  return Array.from(slotTotals.entries())
    .map(([slot, ms]) => {
      const [dayStr, hourStr] = slot.split("-")
      return {
        day: Number(dayStr),
        hour: Number(hourStr),
        hours: Number((ms / MS_PER_HOUR).toFixed(1)),
      }
    })
    .sort((a, b) => {
      if (a.day === b.day) {
        return a.hour - b.hour
      }
      return a.day - b.day
    })
}

type DashboardData = {
  summary: DashboardStats
  topArtists: ReturnType<typeof calculateTopArtists>
  topTracks: ReturnType<typeof calculateTopTracks>
  listeningTrends: ReturnType<typeof calculateListeningTrends>
  listeningClock: ReturnType<typeof calculateListeningClock>
}

const calculateDashboardData = (listens: ListenSummaryRow[]): DashboardData => ({
  summary: calculateDashboardStats(listens),
  topArtists: calculateTopArtists(listens),
  topTracks: calculateTopTracks(listens),
  listeningTrends: calculateListeningTrends(listens),
  listeningClock: calculateListeningClock(listens),
})

const ALL_TIME_OPTION: TimeframeOption = {
  type: "all",
  value: "all",
  label: "All time",
}

export default function DashboardPage() {
  const [listens, setListens] = useState<ListenSummaryRow[] | null>(null)
  const [errorState, setErrorState] = useState<DashboardErrorState>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeValue>(
    ALL_TIME_OPTION.value
  )
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const supabase = useMemo(() => createSupabaseClient(), [])

  useEffect(() => {
    let active = true
    const supabase = createSupabaseBrowserClient()

    const fetchData = async () => {
      const { data, error } = await supabase
        .from("listens")
        .select("ms_played, artist, track, ts")

      if (!active) return

      if (error) {
        const status = getPostgrestErrorStatus(error)

        if (status === 401) {
          setErrorState("unauthorized")
        } else {
          console.error(error)
          setErrorState("error")
        }

        setListens(null)
        return
      }

      setErrorState(null)

      const fetchedListens = (data ?? [])
        .map(toListenSummaryRow)
        .filter((row): row is ListenSummaryRow => row !== null)

      setListens(fetchedListens)
    }

    void fetchData()

    return () => {
      active = false
    }
  }, [supabase])

  const timeframeOptions = useMemo<TimeframeOption[]>(() => {
    if (!listens || listens.length === 0) {
      return [ALL_TIME_OPTION]
    }

    const yearSet = new Set<number>()
    const monthSet = new Set<string>()

    listens.forEach((listen) => {
      if (!listen.ts) return
      const tsDate = new Date(listen.ts)
      if (Number.isNaN(tsDate.getTime())) return
      const year = tsDate.getUTCFullYear()
      yearSet.add(year)
      const month = tsDate.getUTCMonth() + 1
      monthSet.add(`${year}-${String(month).padStart(2, "0")}`)
    })

    const yearOptions: TimeframeYearOption[] = Array.from(yearSet)
      .sort((a, b) => b - a)
      .map((year) => ({
        type: "year",
        value: `year-${year}` as const,
        label: year.toString(),
        year,
      }))

    const monthOptions: TimeframeMonthOption[] = Array.from(monthSet)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => {
        const [yearStr, monthStr] = key.split("-")
        const year = Number(yearStr)
        const month = Number(monthStr)
        const date = new Date(Date.UTC(year, month - 1, 1))
        return {
          type: "month" as const,
          value: `month-${year}-${monthStr}` as const,
          label: MONTH_LABEL_FORMATTER.format(date),
          year,
          month,
        }
      })

    return [ALL_TIME_OPTION, ...yearOptions, ...monthOptions]
  }, [listens])

  useEffect(() => {
    if (!timeframeOptions.some((option) => option.value === selectedTimeframe)) {
      setSelectedTimeframe(ALL_TIME_OPTION.value)
    }
  }, [timeframeOptions, selectedTimeframe])

  const activeTimeframe = useMemo(
    () => timeframeOptions.find((option) => option.value === selectedTimeframe),
    [selectedTimeframe, timeframeOptions]
  )

  const filteredListens = useMemo(() => {
    if (!listens) {
      return null
    }

    if (!activeTimeframe || activeTimeframe.type === "all") {
      return listens
    }

    return listens.filter((listen) => {
      if (!listen.ts) {
        return false
      }

      const tsDate = new Date(listen.ts)
      if (Number.isNaN(tsDate.getTime())) {
        return false
      }

      const year = tsDate.getUTCFullYear()

      if (activeTimeframe.type === "year") {
        return year === activeTimeframe.year
      }

      const month = tsDate.getUTCMonth() + 1
      return (
        activeTimeframe.type === "month" &&
        year === activeTimeframe.year &&
        month === activeTimeframe.month
      )
    })
  }, [activeTimeframe, listens])

  const dashboardData = useMemo(() => {
    if (!filteredListens) {
      return null
    }

    return calculateDashboardData(filteredListens)
  }, [filteredListens])

  const sectionMotion = useDashboardSectionTransition()
  const activeTimeframeKey = activeTimeframe?.value ?? "all"
  const timeframeLabel = activeTimeframe?.label ?? ALL_TIME_OPTION.label
  const isLoadingListens = listens === null
  const hasShareableInsights = Boolean(
    dashboardData &&
      dashboardData.topArtists.length > 0 &&
      dashboardData.topTracks.length > 0
  )

  useEffect(() => {
    if (!hasShareableInsights) {
      setIsShareDialogOpen(false)
    }
  }, [hasShareableInsights])

  const headerSection = (
    <section className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Your listening summary</h1>
        <p className="text-muted-foreground">
          See how many hours you have tuned in, the artists you keep coming
          back to, and the tracks that defined your listening sessions.
        </p>
      </div>
      {errorState ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsShareDialogOpen(true)}
            disabled={isLoadingListens || !hasShareableInsights}
          >
            Share cards
          </Button>
          <TimeframeFilter
            options={timeframeOptions}
            value={selectedTimeframe}
            onValueChange={setSelectedTimeframe}
          />
        </div>
      )}
    </section>
  )

  if (errorState === "unauthorized") {
    return (
      <div className="flex flex-col gap-10">
        {headerSection}
        <DashboardStateMessage
          title="You're signed out"
          description="Sign in to access your Audiograph dashboard."
          action={{ href: "/sign-in", label: "Go to sign-in" }}
        />
      </div>
    )
  }

  if (errorState === "error") {
    return (
      <div className="flex flex-col gap-10">
        {headerSection}
        <DashboardStateMessage
          title="We couldn't load your dashboard"
          description="Please try again in a moment."
          action={{ href: "/dashboard", label: "Try again" }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {headerSection}
      <AnimatePresence mode="wait">
        {dashboardData ? (
          <motion.div
            key={`dashboard-summary-${activeTimeframeKey}`}
            initial={sectionMotion.initial}
            animate={sectionMotion.animate}
            exit={sectionMotion.exit}
          >
            <DashboardSummary stats={dashboardData.summary} />
          </motion.div>
        ) : (
          <motion.div
            key={`dashboard-summary-skeleton-${activeTimeframeKey}`}
            initial={sectionMotion.initial}
            animate={sectionMotion.animate}
            exit={sectionMotion.exit}
          >
            <DashboardSummarySkeleton />
          </motion.div>
        )}
      </AnimatePresence>
      <section
        aria-label="Artist and track insights"
        className="grid gap-6 lg:grid-cols-2"
      >
        <AnimatePresence mode="wait">
          {dashboardData ? (
            <motion.div
              key={`top-artists-${activeTimeframeKey}`}
              initial={sectionMotion.initial}
              animate={sectionMotion.animate}
              exit={sectionMotion.exit}
              className="h-full"
            >
              <TopArtistsChart data={dashboardData.topArtists} className="h-full" />
            </motion.div>
          ) : (
            <motion.div
              key={`top-artists-skeleton-${activeTimeframeKey}`}
              initial={sectionMotion.initial}
              animate={sectionMotion.animate}
              exit={sectionMotion.exit}
              className="h-full"
            >
              <TopArtistsChartSkeleton className="h-full" />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {dashboardData ? (
            <motion.div
              key={`top-tracks-${activeTimeframeKey}`}
              initial={sectionMotion.initial}
              animate={sectionMotion.animate}
              exit={sectionMotion.exit}
              className="h-full"
            >
              <TopTracksTable data={dashboardData.topTracks} className="h-full" />
            </motion.div>
          ) : (
            <motion.div
              key={`top-tracks-skeleton-${activeTimeframeKey}`}
              initial={sectionMotion.initial}
              animate={sectionMotion.animate}
              exit={sectionMotion.exit}
              className="h-full"
            >
              <TopTracksTableSkeleton className="h-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      <section
        aria-label="Listening trends and clock"
        className="grid gap-6 lg:grid-cols-2"
      >
        <AnimatePresence mode="wait">
          {dashboardData ? (
            <motion.div
              key={`listening-trends-${activeTimeframeKey}`}
              initial={sectionMotion.initial}
              animate={sectionMotion.animate}
              exit={sectionMotion.exit}
              className="h-full"
            >
              <ListeningTrendsChart
                data={dashboardData.listeningTrends}
                className="h-full"
              />
            </motion.div>
          ) : (
            <motion.div
              key={`listening-trends-skeleton-${activeTimeframeKey}`}
              initial={sectionMotion.initial}
              animate={sectionMotion.animate}
              exit={sectionMotion.exit}
              className="h-full"
            >
              <ListeningTrendsChartSkeleton className="h-full" />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {dashboardData ? (
            <motion.div
              key={`listening-clock-${activeTimeframeKey}`}
              initial={sectionMotion.initial}
              animate={sectionMotion.animate}
              exit={sectionMotion.exit}
              className="h-full"
            >
              <ListeningClockHeatmap
                data={dashboardData.listeningClock}
                className="h-full"
              />
            </motion.div>
          ) : (
            <motion.div
              key={`listening-clock-skeleton-${activeTimeframeKey}`}
              initial={sectionMotion.initial}
              animate={sectionMotion.animate}
              exit={sectionMotion.exit}
              className="h-full"
            >
              <ListeningClockHeatmapSkeleton className="h-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      <section aria-label="Searchable listening history">
        <AnimatePresence mode="wait">
          {filteredListens ? (
            <motion.div
              key={`listening-history-${activeTimeframeKey}`}
              initial={sectionMotion.initial}
              animate={sectionMotion.animate}
              exit={sectionMotion.exit}
            >
              <ListeningHistory listens={filteredListens} />
            </motion.div>
          ) : (
            <motion.div
              key={`listening-history-skeleton-${activeTimeframeKey}`}
              initial={sectionMotion.initial}
              animate={sectionMotion.animate}
              exit={sectionMotion.exit}
            >
              <ListeningHistorySkeleton />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      <ShareCardsDialog
        open={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        timeframeLabel={timeframeLabel}
        activeTimeframeKey={activeTimeframeKey}
        topArtists={dashboardData?.topArtists ?? []}
        topTracks={dashboardData?.topTracks ?? []}
      />
    </div>
  )
}
