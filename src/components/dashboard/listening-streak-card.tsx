"use client"

import { Flame } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type ListeningStreak = {
  length: number
  start: string
  end: string
}

type ListeningStreakCardProps = {
  streak: ListeningStreak | null
  className?: string
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return DATE_FORMATTER.format(date)
}

function ListeningStreakCard({ streak, className }: ListeningStreakCardProps) {
  return (
    <Card
      aria-labelledby="listening-streak-heading"
      className={cn("shadow-none", className)}
    >
      <CardHeader className="space-y-1">
        <CardTitle id="listening-streak-heading" role="heading" aria-level={3}>
          Listening streaks
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Stay consistent to build longer runs of day-over-day listening.
        </p>
      </CardHeader>
      <CardContent>
        {streak ? (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground">Longest streak</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold" aria-label={`${streak.length} day streak`}>
                  {streak.length}
                </span>
                <span className="text-sm text-muted-foreground">
                  {streak.length === 1 ? "day" : "days"}
                </span>
              </div>
            </div>
            <dl className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Started</dt>
                <dd>{formatDate(streak.start)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Ended</dt>
                <dd>{formatDate(streak.end)}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <EmptyState
            title="No streak yet"
            description="When you listen on consecutive days we'll highlight your streak here."
            icon={<Flame aria-hidden className="h-6 w-6" />}
          />
        )}
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
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

export { ListeningStreakCard, ListeningStreakCardSkeleton }
