"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type GenreData = {
  genre: string
  total_hours: number
  listen_count: number
  unique_artists: number
}

type GenreAnalyticsProps = {
  startDate?: string | null
  endDate?: string | null
  limit?: number
}

export function GenreAnalytics({
  startDate = null,
  endDate = null,
  limit = 10,
}: GenreAnalyticsProps) {
  const [genres, setGenres] = useState<GenreData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchGenres() {
      try {
        setLoading(true)
        setError(null)

        // Type assertion needed until Supabase types are generated
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: rpcError } = await (supabase.rpc as any)(
          "get_top_genres",
          {
            start_date: startDate,
            end_date: endDate,
            limit_count: limit,
          }
        )

        if (rpcError) {
          throw rpcError
        }

        setGenres(data || [])
      } catch (err) {
        console.error("Error fetching genres:", err)
        setError(err instanceof Error ? err.message : "Failed to load genres")
      } finally {
        setLoading(false)
      }
    }

    fetchGenres()
  }, [startDate, endDate, limit])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Genres</CardTitle>
          <CardDescription>Loading genre data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Genres</CardTitle>
          <CardDescription className="text-destructive">
            Error: {error}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (genres.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Genres</CardTitle>
          <CardDescription>
            No genre data available yet. Enrich your listening data with Spotify
            metadata to see genre analytics.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const maxHours = Math.max(...genres.map((g) => g.total_hours))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Genres</CardTitle>
        <CardDescription>
          Your most-listened genres by total listening time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {genres.map((genre, index) => {
            const percentage = (genre.total_hours / maxHours) * 100

            return (
              <div key={genre.genre} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      #{index + 1}
                    </span>
                    <span className="font-medium capitalize">{genre.genre}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {genre.total_hours}h
                  </span>
                </div>

                <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{genre.listen_count.toLocaleString()} listens</span>
                  <span>
                    {genre.unique_artists.toLocaleString()} artists
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
