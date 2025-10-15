"use client"

import { useEffect, useMemo, useState } from "react"

import {
  DashboardSummary,
  DashboardSummarySkeleton,
  type DashboardStats,
} from "@/components/dashboard/dashboard-summary"
import { ListeningClockHeatmap, ListeningClockHeatmapSkeleton } from "@/components/dashboard/listening-clock-heatmap"
import { ListeningTrendsChart, ListeningTrendsChartSkeleton } from "@/components/dashboard/listening-trends-chart"
import { TopArtistsChart, TopArtistsChartSkeleton } from "@/components/dashboard/top-artists-chart"
import { TopTracksTable, TopTracksTableSkeleton } from "@/components/dashboard/top-tracks-table"
import { supabase } from "@/lib/supabaseClient"

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
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeValue>(
    ALL_TIME_OPTION.value
  )

  useEffect(() => {
    let active = true

    const fetchData = async () => {
      const { data, error } = await supabase
        .from("listens")
        .select("ms_played, artist, track, ts")

      if (error) {
        console.error(error)
        return
      }

      if (!active) return

      const fetchedListens = (data ?? [])
        .map(toListenSummaryRow)
        .filter((row): row is ListenSummaryRow => row !== null)

      setListens(fetchedListens)
    }

    void fetchData()

    return () => {
      active = false
    }
  }, [])

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

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Your listening summary</h1>
          <p className="text-muted-foreground">
            See how many hours you have tuned in, the artists you keep coming
            back to, and the tracks that defined your listening sessions.
          </p>
        </div>
        <TimeframeFilter
          options={timeframeOptions}
          value={selectedTimeframe}
          onValueChange={setSelectedTimeframe}
        />
      </section>
      {dashboardData ? (
        <DashboardSummary stats={dashboardData.summary} />
      ) : (
        <DashboardSummarySkeleton />
      )}
      <section
        aria-label="Artist and track insights"
        className="grid gap-6 lg:grid-cols-2"
      >
        {dashboardData ? (
          <TopArtistsChart data={dashboardData.topArtists} />
        ) : (
          <TopArtistsChartSkeleton />
        )}
        {dashboardData ? (
          <TopTracksTable data={dashboardData.topTracks} />
        ) : (
          <TopTracksTableSkeleton />
        )}
      </section>
      <section
        aria-label="Listening trends and clock"
        className="grid gap-6 lg:grid-cols-2"
      >
        {dashboardData ? (
          <ListeningTrendsChart data={dashboardData.listeningTrends} />
        ) : (
          <ListeningTrendsChartSkeleton />
        )}
        {dashboardData ? (
          <ListeningClockHeatmap data={dashboardData.listeningClock} />
        ) : (
          <ListeningClockHeatmapSkeleton />
        )}
      </section>
    </div>
  )
}
