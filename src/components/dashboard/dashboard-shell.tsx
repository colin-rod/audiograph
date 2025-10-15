import * as React from "react"

import { cn } from "@/lib/utils"

type DashboardShellProps = {
  sidebar?: React.ReactNode
  header?: React.ReactNode
  headerActions?: React.ReactNode
  children: React.ReactNode
  className?: string
  mainClassName?: string
}

function DashboardShell({
  sidebar,
  header,
  headerActions,
  children,
  className,
  mainClassName,
}: DashboardShellProps) {
  return (
    <div
      data-slot="dashboard-shell"
      className={cn(
        "bg-background text-foreground flex min-h-screen w-full flex-col lg:grid lg:grid-cols-[280px_minmax(0,1fr)]",
        className
      )}
    >
      <aside
        role="complementary"
        className="bg-[var(--sidebar)] text-[var(--sidebar-foreground)] border-b border-[var(--sidebar-border)] lg:border-b-0 lg:border-r"
      >
        <div className="flex h-full flex-col gap-6 p-6">{sidebar}</div>
      </aside>
      <div className="flex flex-1 flex-col">
        {header || headerActions ? (
          <header className="border-b border-border bg-background px-6 py-6">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {header ? (
                  <div className="min-w-0 flex-1">{header}</div>
                ) : null}
                {headerActions ? (
                  <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
                ) : null}
              </div>
            </div>
          </header>
        ) : null}
        <main
          className={cn(
            "bg-background px-6 py-8 lg:py-10",
            "flex flex-1 flex-col",
            mainClassName
          )}
        >
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">{children}</div>
        </main>
      </div>
    </div>
  )
}

export { DashboardShell }
