"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cva } from "class-variance-authority"
import type { LucideIcon } from "lucide-react"
import { LayoutDashboard, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"

type SidebarNavItem = {
  title: string
  href: string
  description?: string
  icon?: LucideIcon
}

const sidebarLinkVariants = cva(
  "group relative flex items-center gap-4 rounded-full px-5 py-3 text-base font-semibold tracking-tight transition-colors [&>svg]:size-5 [&>svg]:shrink-0",
  {
    variants: {
      active: {
        true: "text-[var(--sidebar-accent-foreground)] shadow-[0_0_0_1px_var(--sidebar-border)] bg-[color:var(--sidebar-accent)]",
        false:
          "text-[var(--sidebar-foreground)]/75 hover:text-[var(--sidebar-foreground)] hover:bg-[color:var(--sidebar-accent-hover)]",
      },
    },
  }
)

const sidebarNavItems: SidebarNavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Insights",
    href: "/dashboard/insights",
    icon: Sparkles,
  },
]

function SidebarNav({ items = sidebarNavItems }: { items?: SidebarNavItem[] }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Sidebar navigation" className="flex flex-col gap-2">
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            data-active={isActive ? "true" : "false"}
            className={cn(
              "before:absolute before:left-2 before:h-6 before:w-1 before:rounded-full before:bg-transparent before:transition-colors data-[active=true]:before:bg-[var(--sidebar-primary)]",
              sidebarLinkVariants({ active: isActive })
            )}
          >
            {item.icon ? <item.icon aria-hidden className="transition-transform group-hover:scale-105" /> : null}
            <span className="truncate">{item.title}</span>
            {item.description ? (
              <span className="text-xs font-normal text-[var(--sidebar-foreground)]/60">
                {item.description}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}

export { SidebarNav, sidebarNavItems }
export type { SidebarNavItem }
