import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { EmptyState } from "./empty-state"

type YearOverYearDelta = {
  year: number
  hours: number
  hoursDelta: number | null
  uniqueArtists: number
  uniqueArtistsDelta: number | null
  sessions: number
  sessionsDelta: number | null
}

type YearOverYearDeltasCardProps = {
  data: YearOverYearDelta[]
  className?: string
}

const formatDelta = (value: number | null): { text: string; tone: "positive" | "negative" | "neutral" } => {
  if (value === null || Number.isNaN(value)) {
    return { text: "—", tone: "neutral" }
  }

  const rounded = Number(value.toFixed(1))
  const sign = rounded > 0 ? "+" : ""
  const text = `${sign}${rounded.toFixed(1)}%`

  if (rounded > 0) {
    return { text, tone: "positive" }
  }

  if (rounded < 0) {
    return { text, tone: "negative" }
  }

  return { text, tone: "neutral" }
}

const DELTA_TONE_STYLES: Record<"positive" | "negative" | "neutral", string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-rose-600 dark:text-rose-400",
  neutral: "text-muted-foreground",
}

function YearOverYearDeltasCard({ data, className }: YearOverYearDeltasCardProps) {
  if (data.length === 0) {
    return (
      <Card
        aria-labelledby="year-over-year-heading"
        className={cn("shadow-none", className)}
      >
        <CardHeader>
          <CardTitle
            id="year-over-year-heading"
            role="heading"
            aria-level={3}
          >
            Year-over-year deltas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="More history needed"
            description="Once you log at least one year of listens, we will chart how your listening grows or slows each year."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      aria-labelledby="year-over-year-heading"
      className={cn("shadow-none", className)}
    >
      <CardHeader className="space-y-1">
        <CardTitle
          id="year-over-year-heading"
          role="heading"
          aria-level={3}
        >
          Year-over-year deltas
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Compare each year to the one before it across hours listened, unique artists, and sessions.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead className="text-right">Δ vs prior</TableHead>
              <TableHead>Artists</TableHead>
              <TableHead className="text-right">Δ vs prior</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead className="text-right">Δ vs prior</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data
              .slice()
              .sort((a, b) => b.year - a.year)
              .map((item) => {
                const hoursDelta = formatDelta(item.hoursDelta)
                const artistsDelta = formatDelta(item.uniqueArtistsDelta)
                const sessionsDelta = formatDelta(item.sessionsDelta)

                return (
                  <TableRow key={item.year}>
                    <TableCell className="font-medium">{item.year}</TableCell>
                    <TableCell className="tabular-nums">
                      {item.hours.toFixed(1)} hrs
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={cn("font-medium", DELTA_TONE_STYLES[hoursDelta.tone])}>
                        {hoursDelta.text}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {item.uniqueArtists.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={cn(
                          "font-medium",
                          DELTA_TONE_STYLES[artistsDelta.tone]
                        )}
                      >
                        {artistsDelta.text}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {item.sessions.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={cn(
                          "font-medium",
                          DELTA_TONE_STYLES[sessionsDelta.tone]
                        )}
                      >
                        {sessionsDelta.text}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function YearOverYearDeltasSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-busy
      data-testid="year-over-year-deltas-skeleton"
      className={cn("shadow-none", className)}
    >
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`yoy-skeleton-row-${index}`} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

export { YearOverYearDeltasCard, YearOverYearDeltasSkeleton }
export type { YearOverYearDelta }
