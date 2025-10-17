"use client"

import { Flame } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type ListeningStreakStats = {
  longestStreak: number
  longestStreakStart: string | null
  longestStreakEnd: string | null
  currentStreak: number
  currentStreakStart: string | null
  currentStreakEnd: string | null
}

type ListeningStreakCardProps = {
  data: ListeningStreakStats | null
  className?: string
}

const DAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const formatDayCount = (value: number) => {
  if (value === 0) return "0 days"
  return `${value} ${value === 1 ? "day" : "days"}`
}

const formatDateRange = (start: string | null, end: string | null) => {
  if (!start || !end) return ""
  const startDate = new Date(start)
  const endDate = new Date(end)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return ""
  }

  if (startDate.getTime() === endDate.getTime()) {
    return DAY_FORMATTER.format(startDate)
  }

  const startLabel = DAY_FORMATTER.format(startDate)
  const endLabel = DAY_FORMATTER.format(endDate)
  return `${startLabel} – ${endLabel}`
}

function ListeningStreakCard({ data, className }: ListeningStreakCardProps) {
  if (!data || data.longestStreak === 0) {
    return (
      <Card
        aria-labelledby="listening-streak-heading"
        className={cn("shadow-none", className)}
      >
        <CardHeader>
          <CardTitle
            id="listening-streak-heading"
            role="heading"
            aria-level={3}
          >
            Listening streaks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Your streaks will appear here"
            description="Keep listening on consecutive days to ignite a streak."
            icon={<Flame aria-hidden className="h-6 w-6" />}
          />
        </CardContent>
      </Card>
    )
  }

  const longestRange = formatDateRange(
    data.longestStreakStart,
    data.longestStreakEnd
  )
  const currentRange = formatDateRange(
    data.currentStreakStart,
    data.currentStreakEnd
  )

  return (
    <Card
      aria-labelledby="listening-streak-heading"
      className={cn("shadow-none", className)}
    >
      <CardHeader className="space-y-1">
        <CardTitle
          id="listening-streak-heading"
          role="heading"
          aria-level={3}
        >
          Listening streaks
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Discover your hottest streaks of uninterrupted listening.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-sm font-medium text-muted-foreground">Longest streak</p>
          <p className="text-3xl font-semibold tracking-tight">
            {formatDayCount(data.longestStreak)}
          </p>
          {longestRange ? (
            <p className="text-sm text-muted-foreground">{longestRange}</p>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Current streak
            </p>
            <p className="text-2xl font-semibold tracking-tight">
              {formatDayCount(data.currentStreak)}
            </p>
            {currentRange ? (
              <p className="text-sm text-muted-foreground">{currentRange}</p>
            ) : null}
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Last active day
            </p>
            <p className="text-2xl font-semibold tracking-tight">
              {data.currentStreakEnd
                ? DAY_FORMATTER.format(new Date(data.currentStreakEnd))
                : "—"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ListeningStreakCardSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-busy
      data-testid="listening-streak-card-skeleton"
      className={cn("shadow-none", className)}
    >
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="grid gap-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export { ListeningStreakCard, ListeningStreakCardSkeleton }
