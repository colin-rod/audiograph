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
import { LineChart } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type ListeningTrendDatum = {
  month: string
  label: string
  hours: number
}

type ListeningTrendsChartProps = {
  data: ListeningTrendDatum[]
  className?: string
}

const formatHours = (value: number) => `${value.toFixed(1)} hrs`

function ListeningTrendsChart({ data, className }: ListeningTrendsChartProps) {
  if (!data.length) {
    return (
      <Card
        aria-labelledby="listening-trends-heading"
        className={cn("shadow-none", className)}
      >
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
          <EmptyState
            title="Trends are on the way"
            description="As soon as you log some listens we will chart your monthly hours here."
            icon={<LineChart aria-hidden className="h-6 w-6" />}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      aria-labelledby="listening-trends-heading"
      className={cn("shadow-none", className)}
    >
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

function ListeningTrendsChartSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-busy
      data-testid="listening-trends-chart-skeleton"
      className={cn("shadow-none", className)}
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
