"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Repeat } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type LoyaltyTrendDatum = {
  month: string
  label: string
  repeatTracks: number
}

export type LoyaltyTopTrack = {
  track: string
  artist: string | null
  playCount: number
}

type LoyaltyGaugeData = {
  threshold: number
  monthlyRepeatTrackCounts: LoyaltyTrendDatum[]
  topRepeatTracks: LoyaltyTopTrack[]
}

type LoyaltyGaugeCardProps = {
  data: LoyaltyGaugeData
  className?: string
}

const formatTooltipLabel = (value: number) => `${value.toLocaleString()} tracks`

function LoyaltyGaugeCard({ data, className }: LoyaltyGaugeCardProps) {
  const { monthlyRepeatTrackCounts, topRepeatTracks, threshold } = data

  if (!monthlyRepeatTrackCounts.length && !topRepeatTracks.length) {
    return (
      <Card
        aria-labelledby="loyalty-gauge-heading"
        className={cn("shadow-none", className)}
      >
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
            title="No replay data yet"
            description={`Once tracks pass ${threshold} plays in a month, we will surface your most replayed favorites here.`}
            icon={<Repeat aria-hidden className="h-6 w-6" />}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      aria-labelledby="loyalty-gauge-heading"
      className={cn("shadow-none", className)}
    >
      <CardHeader className="space-y-1">
        <CardTitle
          id="loyalty-gauge-heading"
          role="heading"
          aria-level={3}
        >
          Loyalty gauge
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          See how many songs cross the replay threshold each month and which ones dominate your queue.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={monthlyRepeatTrackCounts}
              role="img"
              aria-label={`Area chart showing number of tracks played at least ${threshold} times per month`}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
              <Tooltip formatter={(value: number) => formatTooltipLabel(value)} />
              <Area
                type="monotone"
                dataKey="repeatTracks"
                stroke="var(--chart-4)"
                fill="color-mix(in oklch, var(--chart-4) 35%, transparent)"
                strokeWidth={2}
                name="Repeat tracks"
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">
            Most replayed tracks
          </h4>
          {topRepeatTracks.length ? (
            <ol className="mt-3 space-y-2 text-sm">
              {topRepeatTracks.map((track, index) => (
                <li
                  key={`${track.track}-${track.artist ?? "unknown"}`}
                  className="flex items-start gap-2"
                >
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{track.track}</p>
                    <p className="text-muted-foreground">
                      {track.artist
                        ? `${track.artist} · ${track.playCount.toLocaleString()} plays`
                        : `${track.playCount.toLocaleString()} plays`}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No tracks have crossed the replay threshold yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function LoyaltyGaugeCardSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-busy
      data-testid="loyalty-gauge-card-skeleton"
      className={cn("shadow-none", className)}
    >
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        <Skeleton className="h-[240px] w-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-44" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { LoyaltyGaugeCard, LoyaltyGaugeCardSkeleton }
