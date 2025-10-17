"use client"

import { Line, LineChart as RechartsLineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Compass } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type DiscoveryTrendDatum = {
  month: string
  label: string
  newArtists: number
  newTracks: number
}

type DiscoveryTrackerChartProps = {
  data: DiscoveryTrendDatum[]
  className?: string
}

const formatTooltipValue = (value: number, name: string) => [
  value.toLocaleString(undefined, { maximumFractionDigits: 0 }),
  name,
]

function DiscoveryTrackerChart({ data, className }: DiscoveryTrackerChartProps) {
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
            title="No discoveries yet"
            description="As you listen to new artists and tracks, we will highlight when they first join your library."
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
          Track how many brand-new artists and songs enter your rotation each month.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart
              data={data}
              role="img"
              aria-label="Line chart showing new artists and tracks per month"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
              <Tooltip formatter={formatTooltipValue} cursor={{ strokeDasharray: "4 2" }} />
              <Line
                type="monotone"
                dataKey="newArtists"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot
                name="New artists"
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="newTracks"
                stroke="var(--chart-3)"
                strokeWidth={2}
                dot
                name="New tracks"
                activeDot={{ r: 5 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
        <ul className="sr-only">
          {data.map((item) => (
            <li key={item.month}>
              {`${item.label}: ${item.newArtists.toLocaleString()} new artists, ${item.newTracks.toLocaleString()} new tracks`}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function DiscoveryTrackerChartSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-busy
      data-testid="discovery-tracker-chart-skeleton"
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

export { DiscoveryTrackerChart, DiscoveryTrackerChartSkeleton }
