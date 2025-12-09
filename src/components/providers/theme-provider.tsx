"use client"

import type { ComponentProps } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

const ThemeProvider = ({ children, ...props }: ComponentProps<typeof NextThemesProvider>) => {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={["dark", "light"]}
      disableTransitionOnChange
      suppressHydrationWarning
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

export { ThemeProvider }
