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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export type ListeningTrendDatum = {
  month: string
  label: string
  hours: number
}

type ListeningTrendsChartProps = {
  data: ListeningTrendDatum[]
}

const formatHours = (value: number) => `${value.toFixed(1)} hrs`

function ListeningTrendsChart({ data }: ListeningTrendsChartProps) {
  if (!data.length) {
    return (
      <Card aria-labelledby="listening-trends-heading" className="shadow-none">
        <CardHeader>
          <CardTitle
            id="listening-trends-heading"
            role="heading"
            aria-level={3}
          >
            Listening trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Monthly listening totals will appear once we have data.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card aria-labelledby="listening-trends-heading" className="shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle
          id="listening-trends-heading"
          role="heading"
          aria-level={3}
        >
          Listening trends
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track how your listening hours change month over month.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              role="img"
              aria-label="Area chart showing listening hours per month"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toFixed(1)}
                width={40}
              />
              <Tooltip
                cursor={{ stroke: "var(--chart-2)", strokeWidth: 2 }}
                formatter={(value: number) => formatHours(value)}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="var(--chart-2)"
                fill="color-mix(in oklch, var(--chart-2) 35%, transparent)"
                strokeWidth={2}
                dot
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <ul className="sr-only">
          {data.map((item) => (
            <li key={item.month}>{`${item.label}: ${formatHours(item.hours)}`}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function ListeningTrendsChartSkeleton() {
  return (
    <Card
      aria-busy
      data-testid="listening-trends-chart-skeleton"
      className="shadow-none"
    >
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[320px] w-full" />
      </CardContent>
    </Card>
  )
}

export { ListeningTrendsChart, ListeningTrendsChartSkeleton }
