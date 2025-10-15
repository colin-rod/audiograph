import type { ReactNode } from "react"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SidebarNav, sidebarNavItems } from "@/components/dashboard/sidebar-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"

type DashboardLayoutProps = {
  children: ReactNode
}

const sidebarContent = (
  <div className="flex flex-col gap-6">
    <div className="space-y-1">
      <span className="text-xs font-semibold uppercase text-[var(--sidebar-foreground)]/60">
        Audiograph
      </span>
      <p className="text-lg font-semibold text-[var(--sidebar-foreground)]">
        Dashboard
      </p>
    </div>
    <SidebarNav items={sidebarNavItems} />
  </div>
)

const headerContent = (
  <div className="space-y-1">
    <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
    <p className="text-muted-foreground">
      Track the listening habits that power your audiographs.
    </p>
  </div>
)

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <DashboardShell
      sidebar={sidebarContent}
      header={headerContent}
      headerActions={<ThemeToggle />}
    >
      {children}
    </DashboardShell>
  )
}
