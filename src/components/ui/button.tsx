import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-tight transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:ring-offset-0 aria-invalid:ring-destructive/30 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_16px_40px_-18px_rgba(29,185,84,0.8)] hover:bg-primary/90 hover:shadow-[0_20px_45px_-16px_rgba(29,185,84,0.95)]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-[color:var(--shell-border)] bg-transparent text-[color:var(--foreground)] hover:border-[color:rgba(18,18,18,0.3)] hover:bg-[color:rgba(18,18,18,0.08)] hover:text-[color:var(--foreground)] dark:border-[color:rgba(255,255,255,0.24)] dark:text-white dark:hover:border-[color:rgba(255,255,255,0.4)] dark:hover:bg-[color:rgba(255,255,255,0.12)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "text-[color:var(--foreground)] opacity-80 hover:opacity-100 hover:bg-[color:rgba(18,18,18,0.06)] dark:text-white dark:hover:bg-[color:rgba(255,255,255,0.08)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4 [&>svg]:size-5",
        sm: "h-9 gap-1.5 px-4 py-2 [&>svg]:size-4",
        lg: "h-11 px-6 py-2.5 text-base [&>svg]:size-5",
        icon: "size-10 [&>svg]:size-5",
        "icon-sm": "size-9 [&>svg]:size-4",
        "icon-lg": "size-12 [&>svg]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
