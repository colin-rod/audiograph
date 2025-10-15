import type { ComponentProps } from "react"

import { render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type ListenRow = {
  ms_played: number | null
  artist: string | null
  track: string | null
}

type SupabaseSelectResult = {
  data: ListenRow[] | null
  error: Error | null
}

const { usePathnameMock, selectMock, fromMock } = vi.hoisted(() => {
  const pathname = vi.fn<() => string>(() => "/dashboard")
  const select = vi.fn(async (): Promise<SupabaseSelectResult> => ({
    data: [],
    error: null,
  }))
  const from = vi.fn(() => ({ select }))

  return { usePathnameMock: pathname, selectMock: select, fromMock: from }
})

type LinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string | { pathname?: string | null }
}

const resolveHref = (href: LinkProps["href"]) => {
  if (typeof href === "string") {
    return href
  }
  return href?.pathname ?? ""
}

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: LinkProps) => (
    <a href={resolveHref(href)} {...props}>
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
    selectMock.mockClear()
    fromMock.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("renders the dashboard shell with navigation", async () => {
    selectMock.mockResolvedValueOnce({ data: [], error: null })

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

  it("replaces the skeleton with stats once data resolves", async () => {
    selectMock.mockResolvedValueOnce({
      data: [
        { ms_played: 1_800_000, artist: "Artist A", track: "Track 1" },
        { ms_played: 3_600_000, artist: "Artist B", track: "Track 2" },
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

    const summary = await screen.findByTestId("dashboard-summary")
    expect(summary).toBeInTheDocument()

    expect(
      screen.queryByTestId("dashboard-summary-skeleton")
    ).not.toBeInTheDocument()

    const hoursCard = within(summary)
      .getByText("Hours listened")
      .closest("[data-slot='card']")
    const artistsCard = within(summary)
      .getByText("Artists")
      .closest("[data-slot='card']")
    const tracksCard = within(summary)
      .getByText("Tracks")
      .closest("[data-slot='card']")

    expect(hoursCard).not.toBeNull()
    expect(artistsCard).not.toBeNull()
    expect(tracksCard).not.toBeNull()

    if (hoursCard) {
      expect(within(hoursCard as HTMLElement).getByText("1.5")).toBeInTheDocument()
    }

    if (artistsCard) {
      expect(within(artistsCard as HTMLElement).getByText("2")).toBeInTheDocument()
    }

    if (tracksCard) {
      expect(within(tracksCard as HTMLElement).getByText("2")).toBeInTheDocument()
    }
  })
})
