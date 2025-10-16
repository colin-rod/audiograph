'use client'

import { type ReactNode } from "react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  title: string
  description: string
  icon?: ReactNode
  className?: string
}

function EmptyState({ title, description, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-8 text-center",
        className
      )}
    >
      {icon ? (
        <div
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          {icon}
        </div>
      ) : null}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export { EmptyState }
