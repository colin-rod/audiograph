"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Sun } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type DaypartShareDatum = {
  day: number
  dayLabel: string
  morning: number
  afternoon: number
  evening: number
  totalHours: number
  morningHours: number
  afternoonHours: number
  eveningHours: number
}

type DaypartShareChartProps = {
  data: DaypartShareDatum[]
  className?: string
}

const DAYPART_LABELS: Record<"morning" | "afternoon" | "evening", string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
}

const formatShare = (value: number) => `${value.toFixed(1)}%`

function DaypartShareChart({ data, className }: DaypartShareChartProps) {
  const hasListeningData = data.some((item) => item.totalHours > 0)

  if (!hasListeningData) {
    return (
      <Card
        aria-labelledby="daypart-share-heading"
        className={cn("shadow-none", className)}
      >
        <CardHeader>
          <CardTitle
            id="daypart-share-heading"
            role="heading"
            aria-level={3}
          >
            Daypart share
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="We'll split out your dayparts"
            description="As you log more listens we will show how your morning, afternoon, and evening sessions stack up."
            icon={<Sun aria-hidden className="h-6 w-6" />}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      aria-labelledby="daypart-share-heading"
      className={cn("shadow-none", className)}
    >
      <CardHeader className="space-y-1">
        <CardTitle
          id="daypart-share-heading"
          role="heading"
          aria-level={3}
        >
          Daypart share
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          See when you listen the most by tracking the share of hours that land in each part of the day.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              role="img"
              aria-label="Stacked bar chart showing share of listening by day of week and daypart"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dayLabel" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                width={40}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(value: number, name, payload) => {
                  const daypart = (name as keyof typeof DAYPART_LABELS) ?? "morning"
                  const row = payload?.payload as DaypartShareDatum | undefined
                  if (!row) {
                    return [formatShare(value), DAYPART_LABELS[daypart]]
                  }

                  const hoursKey = `${daypart}Hours` as const
                  const hoursValue = row[hoursKey]
                  return [
                    `${formatShare(value)} • ${hoursValue.toFixed(1)} hrs`,
                    DAYPART_LABELS[daypart],
                  ]
                }}
                labelFormatter={(label) => `On ${label}`}
              />
              <Legend
                formatter={(value) => DAYPART_LABELS[value as keyof typeof DAYPART_LABELS]}
              />
              <Bar
                dataKey="morning"
                stackId="daypart"
                fill="color-mix(in oklch, var(--chart-1) 55%, transparent)"
                name="morning"
              />
              <Bar
                dataKey="afternoon"
                stackId="daypart"
                fill="color-mix(in oklch, var(--chart-2) 60%, transparent)"
                name="afternoon"
              />
              <Bar
                dataKey="evening"
                stackId="daypart"
                fill="color-mix(in oklch, var(--chart-3) 60%, transparent)"
                name="evening"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="sr-only">
          {data.map((item) => (
            <li key={item.dayLabel}>
              {`${item.dayLabel}: ${formatShare(item.morning)} morning, ${formatShare(item.afternoon)} afternoon, ${formatShare(item.evening)} evening.`}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function DaypartShareChartSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-busy
      data-testid="daypart-share-chart-skeleton"
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

export { DaypartShareChart, DaypartShareChartSkeleton }
export type { DaypartShareDatum }
