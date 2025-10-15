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

  return { ms_played: msPlayed, artist, track }
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

  return { totalHours, artists, tracks }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    let active = true

    const fetchData = async () => {
      const { data, error } = await supabase
        .from("listens")
        .select("ms_played, artist, track")

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
