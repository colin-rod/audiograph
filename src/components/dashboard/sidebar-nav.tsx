"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

type SidebarNavItem = {
  title: string
  href: string
  description?: string
}

const sidebarLinkVariants = cva(
  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
  {
    variants: {
      active: {
        true: "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]",
        false:
          "text-[var(--sidebar-foreground)]/80 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]",
      },
    },
  }
)

const sidebarNavItems: SidebarNavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
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
            className={cn(sidebarLinkVariants({ active: isActive }))}
          >
            <span>{item.title}</span>
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
