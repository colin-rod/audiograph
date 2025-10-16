"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Users } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type TopArtistDatum = {
  name: string
  hours: number
}

type TopArtistsChartProps = {
  data: TopArtistDatum[]
  className?: string
}

const HOURS_TOOLTIP_LABEL = (value: number) => `${value.toFixed(1)} hrs`

function TopArtistsChart({ data, className }: TopArtistsChartProps) {
  if (!data.length) {
    return (
      <Card
        aria-labelledby="top-artists-heading"
        className={cn("shadow-none", className)}
      >
        <CardHeader>
          <CardTitle id="top-artists-heading" role="heading" aria-level={3}>
            Top artists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No artist insights yet"
            description="Once you start listening, we will highlight the artists you return to most."
            icon={<Users aria-hidden className="h-6 w-6" />}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      aria-labelledby="top-artists-heading"
      className={cn("shadow-none", className)}
    >
      <CardHeader className="space-y-1">
        <CardTitle id="top-artists-heading" role="heading" aria-level={3}>
          Top artists
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ranked by total listening hours.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} role="img" aria-label="Bar chart of top artists">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toFixed(1)}
                width={40}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                formatter={(value: number) => HOURS_TOOLTIP_LABEL(value)}
                labelClassName="font-medium"
              />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={`var(--chart-${(index % 5) + 1})`}
                    aria-label={`Bar for ${data[index]?.name}`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="sr-only">
          {data.map((item) => (
            <li key={item.name}>{`${item.name}: ${HOURS_TOOLTIP_LABEL(item.hours)}`}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function TopArtistsChartSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-busy
      data-testid="top-artists-chart-skeleton"
      className={cn("shadow-none", className)}
    >
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[320px] w-full" />
      </CardContent>
    </Card>
  )
}

export { TopArtistsChart, TopArtistsChartSkeleton }
