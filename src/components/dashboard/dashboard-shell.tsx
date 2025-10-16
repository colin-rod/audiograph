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
        "bg-background text-foreground flex min-h-screen w-full flex-col lg:grid lg:grid-cols-[300px_minmax(0,1fr)]",
        className
      )}
    >
      <aside
        role="complementary"
        className="bg-[color:var(--sidebar)] text-[var(--sidebar-foreground)] border-b border-[color:var(--sidebar-border)] backdrop-blur-xl lg:border-b-0 lg:border-r"
      >
        <div className="flex h-full flex-col gap-8 p-7 lg:p-8">{sidebar}</div>
      </aside>
      <div className="flex flex-1 flex-col gap-6 bg-transparent px-6 py-6 sm:px-8">
        {header || headerActions ? (
          <header className="border border-[color:var(--shell-border)] bg-[color:var(--shell-surface)] backdrop-blur-lg rounded-3xl shadow-[0_10px_40px_-24px_rgba(0,0,0,0.45)]">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-6 sm:px-8 sm:py-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                {header ? (
                  <div className="min-w-0 flex-1">{header}</div>
                ) : null}
                {headerActions ? (
                  <div className="flex shrink-0 items-center gap-3">{headerActions}</div>
                ) : null}
              </div>
            </div>
          </header>
        ) : null}
        <main
          className={cn(
            "flex flex-1 flex-col rounded-3xl border border-[color:var(--shell-border)] bg-[color:var(--shell-surface)] backdrop-blur-lg shadow-[0_20px_80px_-60px_rgba(0,0,0,0.7)]",
            mainClassName
          )}
        >
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8 lg:px-10 lg:py-12">{children}</div>
        </main>
      </div>
    </div>
  )
}

export { DashboardShell }
