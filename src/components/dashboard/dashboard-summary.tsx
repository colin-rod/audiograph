import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type DashboardStats = {
  totalHours: string
  artists: number
  tracks: number
}

type DashboardSummaryProps = {
  stats: DashboardStats
}

const SUMMARY_ITEMS: Array<{ key: keyof DashboardStats; label: string }> = [
  { key: "totalHours", label: "Hours listened" },
  { key: "artists", label: "Artists" },
  { key: "tracks", label: "Tracks" },
]

function DashboardSummary({ stats }: DashboardSummaryProps) {
  return (
    <div
      data-testid="dashboard-summary"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
              {stats[item.key]}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DashboardSummarySkeleton() {
  return (
    <div
      data-testid="dashboard-summary-skeleton"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
