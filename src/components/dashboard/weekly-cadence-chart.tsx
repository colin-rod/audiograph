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
import { CalendarRange } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type WeeklyCadenceDatum = {
  weekStart: string
  weekEnd: string
  label: string
  description: string
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
            title="Weekly insights unlocked after a few listens"
            description="Once you log listens across multiple days we will chart your weekly momentum here."
            icon={<CalendarRange aria-hidden className="h-6 w-6" />}
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
        <CardTitle
          id="weekly-cadence-heading"
          role="heading"
          aria-level={3}
        >
          Weekly cadence
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Follow the ebb and flow of your listening hours week by week.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              role="img"
              aria-label="Area chart showing listening hours per week"
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
                cursor={{ stroke: "var(--chart-3)", strokeWidth: 2 }}
                formatter={(value: number, _name, payload) => [
                  formatHours(value),
                  (payload?.payload as WeeklyCadenceDatum | undefined)?.description ?? "",
                ]}
                labelFormatter={() => ""}
              />
              <Area
                type="monotone"
                dataKey="hours"
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
            <li key={item.weekStart}>{`${item.description}: ${formatHours(item.hours)}`}</li>
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
