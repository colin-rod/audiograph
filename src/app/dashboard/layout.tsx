import type { ReactNode } from "react"

import { AuthButtonGroup } from "@/components/auth/auth-button-group"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SidebarNav, sidebarNavItems } from "@/components/dashboard/sidebar-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

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

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables are not configured.")
    return (
      <DashboardShell
        sidebar={sidebarContent}
        header={headerContent}
        headerActions={
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        }
      >
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h2 className="text-xl font-semibold">Supabase is not configured</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable the dashboard.
          </p>
        </div>
      </DashboardShell>
    )
  }

  const supabase = createSupabaseServerClient()
  if (!supabase) {
    return (
      <DashboardShell
        sidebar={sidebarContent}
        header={headerContent}
        headerActions={
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <AuthButtonGroup orientation="horizontal" />
          </div>
        }
      >
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Supabase environment variables are not configured. Set{' '}
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code>{' '}
          and{' '}
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
          to enable the dashboard.
        </div>
        {children}
      </DashboardShell>
    )
  }
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/sign-in")
  }

  return (
    <DashboardShell
      sidebar={sidebarContent}
      header={headerContent}
      headerActions={
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <AuthButtonGroup orientation="horizontal" />
        </div>
      }
    >
      {children}
    </DashboardShell>
  )
}
