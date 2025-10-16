import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const solidButtonStyles = "bg-primary text-primary-foreground hover:bg-primary/90"
const outlineButtonStyles =
  "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
const softButtonStyles = "bg-secondary text-secondary-foreground hover:bg-secondary/80"
const ghostButtonStyles =
  "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-tight transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:ring-offset-0 aria-invalid:ring-destructive/30 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        primary: solidButtonStyles,
        default: solidButtonStyles,
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        secondary: outlineButtonStyles,
        outline: outlineButtonStyles,
        muted: softButtonStyles,
        ghost: ghostButtonStyles,
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
      variant: "primary",
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
