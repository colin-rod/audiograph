"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Compass } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { DiscoveryTrackerDatum } from "@/lib/analytics-types"

const tooltipFormatter = (value: number, name: string) => {
  if (name === "newArtists") {
    return [value, "New artists"] as const
  }
  if (name === "newTracks") {
    return [value, "New tracks"] as const
  }
  return [value, name] as const
}

type DiscoveryTrackerProps = {
  data: DiscoveryTrackerDatum[]
  className?: string
}

function DiscoveryTracker({ data, className }: DiscoveryTrackerProps) {
  if (!data.length) {
    return (
      <Card
        aria-labelledby="discovery-tracker-heading"
        className={cn("shadow-none", className)}
      >
        <CardHeader>
          <CardTitle
            id="discovery-tracker-heading"
            role="heading"
            aria-level={3}
          >
            Discovery tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Your first plays will appear here"
            description="When you explore a new artist or track we'll highlight the month your rotation expanded."
            icon={<Compass aria-hidden className="h-6 w-6" />}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      aria-labelledby="discovery-tracker-heading"
      className={cn("shadow-none", className)}
    >
      <CardHeader className="space-y-1">
        <CardTitle
          id="discovery-tracker-heading"
          role="heading"
          aria-level={3}
        >
          Discovery tracker
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Count how many fresh artists and tracks entered your listening mix
          each month.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              role="img"
              aria-label="Stacked area chart showing first-time artists and tracks per month"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={40}
              />
              <Tooltip formatter={tooltipFormatter} />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              <Area
                type="monotone"
                dataKey="newTracks"
                name="New tracks"
                stroke="var(--chart-2)"
                fill="color-mix(in oklch, var(--chart-2) 35%, transparent)"
                strokeWidth={2}
                dot
                activeDot={{ r: 5 }}
              />
              <Area
                type="monotone"
                dataKey="newArtists"
                name="New artists"
                stroke="var(--chart-3)"
                fill="color-mix(in oklch, var(--chart-3) 35%, transparent)"
                strokeWidth={2}
                dot
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <ul className="sr-only">
          {data.map((item) => (
            <li key={item.month}>{`${item.label}: ${item.newTracks} new tracks and ${item.newArtists} new artists`}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function DiscoveryTrackerSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-busy
      data-testid="discovery-tracker-skeleton"
      className={cn("shadow-none", className)}
    >
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[320px] w-full" />
      </CardContent>
    </Card>
  )
}

export { DiscoveryTracker, DiscoveryTrackerSkeleton }
