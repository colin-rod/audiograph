"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type EnrichmentProgress = {
  total_listens: number
  enriched_listens: number
  percentage: number
}

export function SpotifyEnrichment() {
  const [progress, setProgress] = useState<EnrichmentProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [enriching, setEnriching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProgress = async () => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc("get_enrichment_progress")
        .single()

      if (rpcError) {
        throw rpcError
      }

      setProgress(data)
    } catch (err) {
      console.error("Error fetching enrichment progress:", err)
      setError(err instanceof Error ? err.message : "Failed to load progress")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProgress()
  }, [])

  const handleEnrich = async () => {
    setEnriching(true)
    setError(null)

    try {
      const response = await fetch("/api/spotify/enrich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: 100 }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Enrichment failed")
      }

      const result = await response.json()

      // Refresh progress
      await fetchProgress()

      // Show success message
      if (result.stats.enriched > 0) {
        alert(
          `Successfully enriched ${result.stats.enriched} listening records!`
        )
      } else if (result.stats.skipped === result.stats.total) {
        alert("No new records to enrich. All records are up to date!")
      }
    } catch (err) {
      console.error("Error enriching data:", err)
      setError(err instanceof Error ? err.message : "Enrichment failed")
    } finally {
      setEnriching(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spotify Metadata Enrichment</CardTitle>
          <CardDescription>Loading enrichment status...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!progress) {
    return null
  }

  const hasUnenrichedData = progress.enriched_listens < progress.total_listens

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spotify Metadata Enrichment</CardTitle>
        <CardDescription>
          Enrich your listening data with genres, album art, and more from
          Spotify
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Enrichment Progress</span>
            <span className="font-medium">
              {progress.enriched_listens.toLocaleString()} /{" "}
              {progress.total_listens.toLocaleString()} ({progress.percentage}
              %)
            </span>
          </div>
          <Progress value={progress.percentage} />
        </div>

        {error && (
          <p className="text-sm text-destructive">Error: {error}</p>
        )}

        {hasUnenrichedData && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              You have {(progress.total_listens - progress.enriched_listens).toLocaleString()}{" "}
              unenriched listening records.
            </p>
            <Button
              onClick={handleEnrich}
              disabled={enriching}
              className="w-full"
            >
              {enriching ? "Enriching..." : "Enrich Next 100 Records"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Note: Enrichment uses the Spotify API and may take a few minutes.
              You can run this multiple times to enrich all your data.
            </p>
          </div>
        )}

        {!hasUnenrichedData && (
          <div className="rounded-md bg-green-50 p-3 dark:bg-green-950">
            <p className="text-sm text-green-800 dark:text-green-200">
              All your listening data is enriched with Spotify metadata!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
