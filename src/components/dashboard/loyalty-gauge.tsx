"use client"

import { TrendingDown, TrendingUp, Minus } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { LoyaltyGaugeData, LoyaltyTrendDatum } from "@/lib/analytics-types"

type LoyaltyGaugeProps = {
  data: LoyaltyGaugeData
  className?: string
}

const formatPercentage = (value: number) => `${Math.round(value * 100)}%`

const getTrendIcon = (change: number) => {
  if (change > 0.005) {
    return <TrendingUp aria-hidden className="h-4 w-4 text-emerald-500" />
  }
  if (change < -0.005) {
    return <TrendingDown aria-hidden className="h-4 w-4 text-rose-500" />
  }
  return <Minus aria-hidden className="h-4 w-4 text-muted-foreground" />
}

const getTrendLabel = (change: number, previousLabel: string | null) => {
  if (previousLabel === null) {
    return "This is the first month of repeat listening data."
  }
  const absolute = Math.abs(Math.round(change * 100))
  if (change > 0.005) {
    return `Repeat listening is up ${absolute}% vs ${previousLabel}.`
  }
  if (change < -0.005) {
    return `Repeat listening is down ${absolute}% vs ${previousLabel}.`
  }
  return `Repeat listening is steady compared to ${previousLabel}.`
}

const summarizeHistory = (monthly: LoyaltyTrendDatum[]) =>
  monthly.slice(-4).map((entry) => ({
    label: entry.label,
    percentage: formatPercentage(entry.repeatListenShare),
  }))

function LoyaltyGauge({ data, className }: LoyaltyGaugeProps) {
  if (!data.monthly.length) {
    return (
      <Card aria-labelledby="loyalty-gauge-heading" className={cn("shadow-none", className)}>
        <CardHeader>
          <CardTitle
            id="loyalty-gauge-heading"
            role="heading"
            aria-level={3}
          >
            Loyalty gauge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Replays will show up soon"
            description={`Once a track crosses ${data.threshold} plays in a timeframe we'll track how often you come back to it.`}
          />
        </CardContent>
      </Card>
    )
  }

  const current = data.monthly[data.monthly.length - 1]
  const previous = data.monthly.length > 1 ? data.monthly[data.monthly.length - 2] : null
  const repeatShare = current.repeatListenShare
  const change = previous ? repeatShare - previous.repeatListenShare : 0

  const history = summarizeHistory(data.monthly)
  const topTracks = data.topRepeatTracks.slice(0, 3)

  return (
    <Card aria-labelledby="loyalty-gauge-heading" className={cn("shadow-none", className)}>
      <CardHeader className="space-y-1">
        <CardTitle
          id="loyalty-gauge-heading"
          role="heading"
          aria-level={3}
        >
          Loyalty gauge
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Measure how often you replay favourites and which songs keep you
          coming back.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>{current.label}</span>
            <span>{formatPercentage(repeatShare)}</span>
          </div>
          <Progress value={repeatShare * 100} aria-label={`Repeat listens: ${formatPercentage(repeatShare)}`} />
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            {getTrendIcon(change)}
            <span>{getTrendLabel(change, previous?.label ?? null)}</span>
          </div>
        </div>
        {history.length > 1 ? (
          <div>
            <h3 className="text-sm font-semibold">Recent repeat share</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {history.map((item) => (
                <li key={item.label} className="flex items-center justify-between">
                  <span>{item.label}</span>
                  <span>{item.percentage}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {topTracks.length ? (
          <div>
            <h3 className="text-sm font-semibold">
              Tracks played {data.threshold}+ times
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {topTracks.map((track) => (
                <li key={track.track} className="flex items-center justify-between">
                  <span>
                    {track.track}
                    {track.artist ? (
                      <span className="text-muted-foreground"> — {track.artist}</span>
                    ) : null}
                  </span>
                  <span className="font-medium text-foreground">
                    {track.playCount}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No tracks have crossed the {data.threshold}-play mark yet in this
            timeframe.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function LoyaltyGaugeSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-busy
      data-testid="loyalty-gauge-skeleton"
      className={cn("shadow-none", className)}
    >
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  )
}

export { LoyaltyGauge, LoyaltyGaugeSkeleton }
