"use client"

import { Fragment } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export type ListeningClockDatum = {
  day: number
  hour: number
  hours: number
}

type ListeningClockHeatmapProps = {
  data: ListeningClockDatum[]
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

const formatHours = (value: number) => `${value.toFixed(1)} hrs`

const findMaxHours = (data: ListeningClockDatum[]): number =>
  data.reduce((max, item) => Math.max(max, item.hours), 0)

function ListeningClockHeatmap({ data }: ListeningClockHeatmapProps) {
  if (!data.length) {
    return (
      <Card aria-labelledby="listening-clock-heading" className="shadow-none">
        <CardHeader>
          <CardTitle
            id="listening-clock-heading"
            role="heading"
            aria-level={3}
          >
            Listening clock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We will highlight your most active hours once data is available.
          </p>
        </CardContent>
      </Card>
    )
  }

  const maxHours = findMaxHours(data) || 1
  const grid = new Map<number, Map<number, number>>()
  data.forEach(({ day, hour, hours }) => {
    if (!grid.has(day)) {
      grid.set(day, new Map())
    }
    grid.get(day)?.set(hour, hours)
  })

  return (
    <Card aria-labelledby="listening-clock-heading" className="shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle
          id="listening-clock-heading"
          role="heading"
          aria-level={3}
        >
          Listening clock
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          See which days and hours you listen the most.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <div
            role="grid"
            aria-label="Heatmap of listening hours by day and hour"
            className="inline-grid grid-cols-[max-content_repeat(24,minmax(24px,1fr))] gap-1"
          >
            <span />
            {Array.from({ length: 24 }).map((_, hour) => (
              <span
                key={`hour-label-${hour}`}
                role="columnheader"
                className="text-[10px] font-medium text-muted-foreground text-center"
              >
                {hour}
              </span>
            ))}
            {DAYS.map((dayLabel, dayIndex) => (
              <Fragment key={`row-${dayLabel}`}>
                <span role="rowheader" className="pr-2 text-xs font-medium text-muted-foreground">
                  {dayLabel}
                </span>
                {Array.from({ length: 24 }).map((_, hour) => {
                  const hoursListened = grid.get(dayIndex)?.get(hour) ?? 0
                  const intensity = hoursListened / maxHours
                  return (
                    <button
                      key={`cell-${dayLabel}-${hour}`}
                      type="button"
                      role="gridcell"
                      className="h-6 w-6 rounded-sm border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
                      style={{
                        backgroundColor: "var(--chart-3)",
                        opacity: intensity === 0 ? 0.12 : 0.25 + intensity * 0.75,
                      }}
                      aria-label={`${dayLabel} at ${hour}:00 — ${formatHours(hoursListened)}`}
                    />
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Low</span>
          <div
            aria-hidden
            className="h-2 flex-1 rounded-full"
            style={{
              background:
                "linear-gradient(to right, color-mix(in oklch, var(--chart-3) 15%, transparent), var(--chart-3))",
            }}
          />
          <span>High</span>
        </div>
      </CardContent>
    </Card>
  )
}

function ListeningClockHeatmapSkeleton() {
  return (
    <Card
      aria-busy
      data-testid="listening-clock-heatmap-skeleton"
      className="shadow-none"
    >
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-[210px] w-full" />
        <Skeleton className="h-4 w-32" />
      </CardContent>
    </Card>
  )
}

export { ListeningClockHeatmap, ListeningClockHeatmapSkeleton }
