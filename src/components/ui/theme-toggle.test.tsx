import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ThemeToggle } from "./theme-toggle"

const themeState = {
  theme: "light" as "light" | "dark" | "system",
  resolvedTheme: "light" as "light" | "dark" | undefined,
}

const setThemeMock = vi.fn()

vi.mock("next-themes", () => ({
  useTheme: () => ({
    ...themeState,
    setTheme: setThemeMock,
  }),
}))

describe("ThemeToggle", () => {
  beforeEach(() => {
    themeState.theme = "light"
    themeState.resolvedTheme = "light"
    setThemeMock.mockClear()
  })

  it("switches to dark theme when currently light", async () => {
    render(<ThemeToggle />)

    const button = screen.getByRole("button", { name: /switch to dark theme/i })
    await userEvent.click(button)

    expect(setThemeMock).toHaveBeenCalledWith("dark")
  })

  it("switches to light theme when currently dark", async () => {
    themeState.theme = "dark"
    themeState.resolvedTheme = "dark"

    render(<ThemeToggle />)

    const button = screen.getByRole("button", { name: /switch to light theme/i })
    await userEvent.click(button)

    expect(setThemeMock).toHaveBeenCalledWith("light")
  })

  it("derives theme from resolved value when set to system", async () => {
    themeState.theme = "system"
    themeState.resolvedTheme = "dark"

    render(<ThemeToggle />)

    const button = screen.getByRole("button", { name: /switch to light theme/i })
    await userEvent.click(button)

    expect(setThemeMock).toHaveBeenCalledWith("light")
  })
})
