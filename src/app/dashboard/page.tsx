"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

export const dynamic = "force-dynamic"

import {
  DashboardSummary,
  DashboardSummarySkeleton,
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
import { getDashboardData, getAvailableTimeframes } from "@/lib/analytics-service"
import type { TimeframeFilter as TimeframeFilterType } from "@/lib/analytics-types"

import {
  TimeframeFilter,
  type TimeframeMonthOption,
  type TimeframeOption,
  type TimeframeValue,
  type TimeframeYearOption,
} from "@/components/dashboard/timeframe-filter"

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

const ALL_TIME_OPTION: TimeframeOption = {
  type: "all",
  value: "all",
  label: "All time",
}

type DashboardData = {
  summary: ReturnType<typeof getDashboardData>["data"]["summary"]
  topArtists: ReturnType<typeof getDashboardData>["data"]["topArtists"]
  topTracks: ReturnType<typeof getDashboardData>["data"]["topTracks"]
  listeningTrends: ReturnType<typeof getDashboardData>["data"]["listeningTrends"]
  listeningClock: ReturnType<typeof getDashboardData>["data"]["listeningClock"]
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [errorState, setErrorState] = useState<DashboardErrorState>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeValue>(
    ALL_TIME_OPTION.value
  )
  const [timeframeOptions, setTimeframeOptions] = useState<TimeframeOption[]>([
    ALL_TIME_OPTION,
  ])
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const supabase = useMemo(() => createSupabaseClient(), [])

  const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  })

  // Fetch available timeframes on mount
  useEffect(() => {
    let active = true
    const supabase = createSupabaseBrowserClient()

    const fetchTimeframes = async () => {
      const result = await getAvailableTimeframes(supabase)

      if (!active) return

      if (!result.success) {
        const status = getPostgrestErrorStatus(result.error)
        if (status === 401) {
          setErrorState("unauthorized")
        } else {
          console.error(result.error)
          setErrorState("error")
        }
        return
      }

      const yearSet = new Set<number>()
      const monthMap = new Map<string, { year: number; month: number }>()

      result.data.forEach((tf) => {
        yearSet.add(tf.year)
        const key = `${tf.year}-${String(tf.month).padStart(2, "0")}`
        monthMap.set(key, { year: tf.year, month: tf.month })
      })

      const yearOptions: TimeframeYearOption[] = Array.from(yearSet)
        .sort((a, b) => b - a)
        .map((year) => ({
          type: "year",
          value: `year-${year}` as const,
          label: year.toString(),
          year,
        }))

      const monthOptions: TimeframeMonthOption[] = Array.from(monthMap.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([key, { year, month }]) => {
          const date = new Date(Date.UTC(year, month - 1, 1))
          return {
            type: "month" as const,
            value: `month-${year}-${String(month).padStart(2, "0")}` as const,
            label: MONTH_LABEL_FORMATTER.format(date),
            year,
            month,
          }
        })

      setTimeframeOptions([ALL_TIME_OPTION, ...yearOptions, ...monthOptions])
    }

    void fetchTimeframes()

    return () => {
      active = false
    }
  }, [])

  const activeTimeframe = useMemo(
    () => timeframeOptions.find((option) => option.value === selectedTimeframe),
    [selectedTimeframe, timeframeOptions]
  )

  const timeframeFilter = useMemo((): TimeframeFilterType => {
    if (!activeTimeframe || activeTimeframe.type === "all") {
      return { type: "all" }
    }
    if (activeTimeframe.type === "year") {
      return { type: "year", year: activeTimeframe.year }
    }
    return {
      type: "month",
      year: activeTimeframe.year,
      month: activeTimeframe.month,
    }
  }, [activeTimeframe])

  // Fetch dashboard data when timeframe changes
  useEffect(() => {
    let active = true
    const supabase = createSupabaseBrowserClient()

    const fetchData = async () => {
      const result = await getDashboardData(supabase, timeframeFilter)

      if (!active) return

      if (!result.success) {
        const status = getPostgrestErrorStatus(result.error)
        if (status === 401) {
          setErrorState("unauthorized")
        } else {
          console.error(result.error)
          setErrorState("error")
        }
        setDashboardData(null)
        return
      }

      setErrorState(null)
      setDashboardData(result.data)
    }

    void fetchData()

    return () => {
      active = false
    }
  }, [timeframeFilter, supabase])

  const sectionMotion = useDashboardSectionTransition()
  const activeTimeframeKey = activeTimeframe?.value ?? "all"
  const timeframeLabel = activeTimeframe?.label ?? ALL_TIME_OPTION.label
  const isLoadingData = dashboardData === null
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
            disabled={isLoadingData || !hasShareableInsights}
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
          <motion.div
            key={`listening-history-${activeTimeframeKey}`}
            initial={sectionMotion.initial}
            animate={sectionMotion.animate}
            exit={sectionMotion.exit}
          >
            <ListeningHistory timeframeFilter={timeframeFilter} />
          </motion.div>
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
