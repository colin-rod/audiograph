import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { EmptyState } from "./empty-state"

type TimeframeBenchmarkMetric = {
  key: "hours" | "artists"
  label: string
  value: number
  displayValue: string
  rank: number | null
  total: number
  leaderLabel: string
  leaderDisplayValue: string
}

type TimeframeBenchmarkData = {
  timeframeLabel: string
  scopeLabel: string
  hasComparisons: boolean
  metrics: TimeframeBenchmarkMetric[]
}

type TimeframeBenchmarkCardProps = {
  data: TimeframeBenchmarkData
  className?: string
}

const formatRank = (rank: number | null, total: number) => {
  if (!rank || total === 0) {
    return "No ranking yet"
  }

  return `Rank ${rank} of ${total}`
}

function TimeframeBenchmarkCard({ data, className }: TimeframeBenchmarkCardProps) {
  if (data.metrics.length === 0) {
    return (
      <Card
        aria-labelledby="timeframe-benchmark-heading"
        className={cn("shadow-none", className)}
      >
        <CardHeader>
          <CardTitle
            id="timeframe-benchmark-heading"
            role="heading"
            aria-level={3}
          >
            Timeframe benchmark
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Benchmark coming soon"
            description={data.scopeLabel}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      aria-labelledby="timeframe-benchmark-heading"
      className={cn("shadow-none", className)}
    >
      <CardHeader className="space-y-1">
        <CardTitle
          id="timeframe-benchmark-heading"
          role="heading"
          aria-level={3}
        >
          Timeframe benchmark
        </CardTitle>
        <p className="text-sm text-muted-foreground">{data.scopeLabel}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 px-3 py-2">
          <p className="text-sm font-medium text-muted-foreground">
            {data.timeframeLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.hasComparisons
              ? "Your selected period ranked against all available ones."
              : "Log more months or years to unlock full rankings."}
          </p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          {data.metrics.map((metric) => (
            <div
              key={metric.key}
              className="space-y-1 rounded-lg border p-4"
            >
              <dt className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </dt>
              <dd className="text-2xl font-semibold">
                {metric.displayValue}
              </dd>
              <p className="text-xs text-muted-foreground">
                {formatRank(metric.rank, metric.total)}
                {data.hasComparisons ? (
                  <span>
                    {" "}• Leader: {metric.leaderLabel} ({metric.leaderDisplayValue})
                  </span>
                ) : null}
              </p>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function TimeframeBenchmarkCardSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-busy
      data-testid="timeframe-benchmark-skeleton"
      className={cn("shadow-none", className)}
    >
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={`timeframe-metric-${index}`} className="h-24 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export { TimeframeBenchmarkCard, TimeframeBenchmarkCardSkeleton }
export type { TimeframeBenchmarkData, TimeframeBenchmarkMetric }
