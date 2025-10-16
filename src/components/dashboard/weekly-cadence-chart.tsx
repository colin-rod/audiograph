"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { CalendarClock } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type WeeklyCadenceDatum = {
  week: string
  label: string
  rangeLabel: string
  hours: number
}

type WeeklyCadenceChartProps = {
  data: WeeklyCadenceDatum[]
  className?: string
}

const formatHours = (value: number) => `${value.toFixed(1)} hrs`

function WeeklyCadenceChart({ data, className }: WeeklyCadenceChartProps) {
  if (!data.length) {
    return (
      <Card
        aria-labelledby="weekly-cadence-heading"
        className={cn("shadow-none", className)}
      >
        <CardHeader>
          <CardTitle
            id="weekly-cadence-heading"
            role="heading"
            aria-level={3}
          >
            Weekly cadence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No weekly cadence yet"
            description="Once you listen across a few weeks, we will chart the cadence of your sessions here."
            icon={<CalendarClock aria-hidden className="h-6 w-6" />}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      aria-labelledby="weekly-cadence-heading"
      className={cn("shadow-none", className)}
    >
      <CardHeader className="space-y-1">
        <CardTitle id="weekly-cadence-heading" role="heading" aria-level={3}>
          Weekly cadence
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Compare your listening hours week over week to spot seasonal spikes.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              role="img"
              aria-label="Bar chart showing listening hours per week"
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
                cursor={{ fill: "color-mix(in oklch, var(--chart-3) 18%, transparent)" }}
                formatter={(value: number) => formatHours(value)}
                labelFormatter={(label, payload) => {
                  const rangeLabel = payload?.[0]?.payload?.rangeLabel
                  return rangeLabel ?? label
                }}
              />
              <Bar
                dataKey="hours"
                stroke="var(--chart-3)"
                fill="color-mix(in oklch, var(--chart-3) 65%, transparent)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="sr-only">
          {data.map((item) => (
            <li key={item.week}>{`${item.rangeLabel}: ${formatHours(item.hours)}`}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function WeeklyCadenceChartSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-busy
      data-testid="weekly-cadence-chart-skeleton"
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

export { WeeklyCadenceChart, WeeklyCadenceChartSkeleton }
