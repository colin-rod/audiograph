"use client"

import { useEffect, useState } from "react"

import {
  DashboardSummary,
  DashboardSummarySkeleton,
  type DashboardStats,
} from "@/components/dashboard/dashboard-summary"
import { supabase } from "@/lib/supabaseClient"

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

const calculateDashboardStats = (listens: ListenSummaryRow[]): DashboardStats => {
  const totalMs = listens.reduce(
    (acc, listen) => acc + (listen.ms_played ?? 0),
    0
  )
  const totalHours = (totalMs / (1000 * 60 * 60)).toFixed(1)
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)

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

      const listens = (data ?? [])
        .map(toListenSummaryRow)
        .filter((row): row is ListenSummaryRow => row !== null)

      setStats(calculateDashboardStats(listens))
    }

    void fetchData()

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex flex-col gap-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Your listening summary</h1>
        <p className="text-muted-foreground">
          See how many hours you have tuned in, the artists you keep coming back
          to, and the tracks that defined your listening sessions.
        </p>
      </section>
      {stats ? <DashboardSummary stats={stats} /> : <DashboardSummarySkeleton />}
    </div>
  )
}
