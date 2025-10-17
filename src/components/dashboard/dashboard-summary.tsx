import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type DashboardStats = {
  totalHours: string
  artists: number
  tracks: number
  topArtist: string | null
  mostActiveYear: string | null
}

type DashboardSummaryProps = {
  stats: DashboardStats
  className?: string
}

const SUMMARY_ITEMS: Array<{ key: keyof DashboardStats; label: string }> = [
  { key: "totalHours", label: "Hours listened" },
  { key: "artists", label: "Artists" },
  { key: "tracks", label: "Tracks" },
  { key: "topArtist", label: "Top artist" },
  { key: "mostActiveYear", label: "Most active year" },
]

const formatSummaryValue = (
  value: DashboardStats[keyof DashboardStats]
): string => {
  if (value === null || value === undefined) {
    return "—"
  }

  if (typeof value === "number") {
    return value.toLocaleString("en-US")
  }

  return value
}

function DashboardSummary({ stats, className }: DashboardSummaryProps) {
  return (
    <div
      data-testid="dashboard-summary"
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
        className
      )}
    >
      {SUMMARY_ITEMS.map((item) => (
        <Card key={item.key} className="shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {formatSummaryValue(stats[item.key])}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DashboardSummarySkeleton({ className }: { className?: string }) {
  return (
    <div
      data-testid="dashboard-summary-skeleton"
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
        className
      )}
    >
      {SUMMARY_ITEMS.map((item) => (
        <Card key={item.key} className="shadow-none">
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export { DashboardSummary, DashboardSummarySkeleton }
export type { DashboardStats }
