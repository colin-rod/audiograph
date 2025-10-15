import type { ComponentProps } from "react"

import { render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, test, beforeEach, afterEach, vi } from "vitest"

const { usePathnameMock, selectMock, fromMock } = vi.hoisted(() => {
  const pathname = vi.fn<string, []>()
  const select = vi.fn()
  const from = vi.fn(() => ({ select }))

  return { usePathnameMock: pathname, selectMock: select, fromMock: from }
})

type LinkProps = ComponentProps<"a"> & {
  href: string | { pathname?: string }
}

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: LinkProps) => (
    <a href={typeof href === "string" ? href : href?.pathname ?? ""} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}))

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: fromMock,
  },
}))

import DashboardLayout from "./layout"
import DashboardPage from "./page"

describe("Dashboard page", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/dashboard")
    selectMock.mockReset()
    fromMock.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test("renders the dashboard shell with navigation", async () => {
    selectMock.mockResolvedValue({ data: [], error: null })

    render(
      <DashboardLayout>
        <DashboardPage />
      </DashboardLayout>
    )

    expect(
      screen.getByRole("navigation", { name: /sidebar navigation/i })
    ).toBeInTheDocument()

    const overviewLink = screen.getByRole("link", { name: "Overview" })
    expect(overviewLink).toHaveAttribute("aria-current", "page")

    expect(
      screen.getByTestId("dashboard-summary-skeleton")
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-summary")).toBeInTheDocument()
    })

    expect(
      screen.queryByTestId("dashboard-summary-skeleton")
    ).not.toBeInTheDocument()
  })

  test("replaces the skeleton with stats once data resolves", async () => {
    selectMock.mockResolvedValue({
      data: [
        { ms_played: 1800000, artist: "Artist A", track: "Track 1" },
        { ms_played: 3600000, artist: "Artist B", track: "Track 2" },
      ],
      error: null,
    })

    render(
      <DashboardLayout>
        <DashboardPage />
      </DashboardLayout>
    )

    expect(
      screen.getByTestId("dashboard-summary-skeleton")
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-summary")).toBeInTheDocument()
    })

    expect(
      screen.queryByTestId("dashboard-summary-skeleton")
    ).not.toBeInTheDocument()

    expect(screen.getByText("1.5")).toBeInTheDocument()

    const artistsCard = screen.getByText("Artists").closest("[data-slot='card']")
    const tracksCard = screen.getByText("Tracks").closest("[data-slot='card']")

    expect(artistsCard).not.toBeNull()
    expect(tracksCard).not.toBeNull()

    if (artistsCard) {
      expect(within(artistsCard).getByText("2")).toBeInTheDocument()
    }

    if (tracksCard) {
      expect(within(tracksCard).getByText("2")).toBeInTheDocument()
    }
  })
})
