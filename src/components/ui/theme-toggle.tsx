"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

const ThemeToggle = () => {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const activeTheme = (theme === "system" ? resolvedTheme : theme) ?? "light"
  const isDark = activeTheme === "dark"

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={handleToggle}
    >
      <Sun
        aria-hidden="true"
        className={cn(
          "size-5 transition-all",
          mounted && isDark ? "-rotate-90 scale-0" : "rotate-0 scale-100"
        )}
      />
      <Moon
        aria-hidden="true"
        className={cn(
          "absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 transition-all",
          mounted && isDark ? "rotate-0 scale-100" : "rotate-90 scale-0"
        )}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

export { ThemeToggle }
