import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardSummarySkeleton } from "@/components/dashboard/dashboard-summary"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <DashboardShell
      sidebar={
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </div>
      }
      header={
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      }
    >
      <div className="flex flex-col gap-10">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-[60%] max-w-md" />
        </div>
        <DashboardSummarySkeleton />
      </div>
    </DashboardShell>
  )
}
