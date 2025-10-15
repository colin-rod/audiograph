import * as React from 'react'

import { cn } from '@/lib/utils'

export type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number
  min?: number
  max?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, min = 0, max = 100, ...props }, ref) => {
    const safeMin = Number.isFinite(min) ? min : 0
    const safeMax = Number.isFinite(max) && max !== safeMin ? max : safeMin + 100
    const safeValue = Number.isFinite(value) ? value : safeMin
    const ratio = Math.min(Math.max((safeValue - safeMin) / (safeMax - safeMin), 0), 1)
    const percentage = ratio * 100

    return (
      <div
        ref={ref}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
        role="progressbar"
        aria-valuemin={safeMin}
        aria-valuemax={safeMax}
        aria-valuenow={Math.round(safeValue)}
        {...props}
      >
        <div
          className="h-full w-full flex-1 bg-primary transition-all"
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </div>
    )
  },
)
Progress.displayName = 'Progress'

export { Progress }
