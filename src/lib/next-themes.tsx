"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

const storageKey = "theme"

type Theme = "light" | "dark" | "system"

type ResolvedTheme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: ResolvedTheme
  systemTheme: ResolvedTheme
}

type ThemeProviderProps = {
  attribute?: string
  children: ReactNode
  defaultTheme?: Theme
  disableTransitionOnChange?: boolean
  enableSystem?: boolean
  suppressHydrationWarning?: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") {
    return "light"
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

const withDisabledTransitions = (disable?: boolean) => {
  if (!disable || typeof document === "undefined") {
    return () => {}
  }

  const style = document.createElement("style")
  style.appendChild(document.createTextNode("*{transition:none!important}"))
  document.head.appendChild(style)

  return () => {
    document.head.removeChild(style)
  }
}

const applyThemeAttribute = (attribute: string, value: ResolvedTheme) => {
  if (typeof document === "undefined") {
    return
  }

  const root = document.documentElement

  if (attribute === "class") {
    root.classList.remove("light", "dark")
    root.classList.add(value)
    return
  }

  root.setAttribute(attribute, value)
}

const ThemeProvider = ({
  attribute = "class",
  children,
  defaultTheme = "system",
  disableTransitionOnChange = true,
  enableSystem = true,
}: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light")
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)
  const themeRef = useRef<Theme>(defaultTheme)

  const updateResolvedTheme = useCallback(
    (value: Theme) => {
      const systemValue = getSystemTheme()
      setSystemTheme(systemValue)

      if (value === "system") {
        setResolvedTheme(systemValue)
        return systemValue
      }

      setResolvedTheme(value)
      return value
    },
    []
  )

  const applyTheme = useCallback(
    (value: Theme) => {
      themeRef.current = value
      setThemeState(value)

      if (typeof window === "undefined") {
        return
      }

      const cleanup = withDisabledTransitions(disableTransitionOnChange)

      const next = updateResolvedTheme(value)
      applyThemeAttribute(attribute, next)

      if (value === "system") {
        window.localStorage.removeItem(storageKey)
      } else {
        window.localStorage.setItem(storageKey, value)
      }

      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => cleanup())
      } else {
        cleanup()
      }
    },
    [attribute, disableTransitionOnChange, updateResolvedTheme]
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const stored = window.localStorage.getItem(storageKey) as Theme | null
    const initial = stored ?? defaultTheme

    applyTheme(initial)
  }, [applyTheme, defaultTheme])

  useEffect(() => {
    if (!enableSystem || typeof window === "undefined") {
      return
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const listener = (event: MediaQueryListEvent) => {
      if (themeRef.current === "system") {
        const next = event.matches ? "dark" : "light"
        setResolvedTheme(next)
        setSystemTheme(next)
        applyThemeAttribute(attribute, next)
      } else {
        setSystemTheme(event.matches ? "dark" : "light")
      }
    }

    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [attribute, enableSystem])

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: applyTheme,
      resolvedTheme,
      systemTheme,
    }),
    [applyTheme, resolvedTheme, systemTheme, theme]
  )

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}

const useTheme = () => {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}

export { ThemeProvider, useTheme }
export type { ThemeProviderProps, Theme }
