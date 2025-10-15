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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export type TopArtistDatum = {
  name: string
  hours: number
}

type TopArtistsChartProps = {
  data: TopArtistDatum[]
}

const HOURS_TOOLTIP_LABEL = (value: number) => `${value.toFixed(1)} hrs`

function TopArtistsChart({ data }: TopArtistsChartProps) {
  if (!data.length) {
    return (
      <Card aria-labelledby="top-artists-heading" className="shadow-none">
        <CardHeader>
          <CardTitle id="top-artists-heading" role="heading" aria-level={3}>
            Top artists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No artist listening data available yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card aria-labelledby="top-artists-heading" className="shadow-none">
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

function TopArtistsChartSkeleton() {
  return (
    <Card aria-busy data-testid="top-artists-chart-skeleton" className="shadow-none">
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
