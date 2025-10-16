import type { ComponentProps } from "react"

import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type ListenRow = {
  ms_played: number | null
  artist: string | null
  track: string | null
  ts: string | null
}

type SupabaseSelectError = {
  message: string
  status?: number
  code?: string
  details?: string
  hint?: string
}

type SupabaseSelectResult = {
  data: ListenRow[] | null
  error: SupabaseSelectError | null
}

const {
  usePathnameMock,
  selectMock,
  fromMock,
  supabaseBrowserClient,
  createSupabaseBrowserClientMock,
  getSessionMock,
  redirectMock,
  createSupabaseClientMock,
} = vi.hoisted(() => {
  const pathname = vi.fn<() => string>(() => "/dashboard")
  const select = vi.fn(async (): Promise<SupabaseSelectResult> => ({
    data: [],
    error: null,
  }))
  const from = vi.fn(() => ({ select }))
  const supabaseClient = { from }
  const createClient = vi.fn(() => supabaseClient)
  const createSupabaseClient = vi.fn(() => ({
    from,
  }))
  const getSession = vi.fn(
    async (): Promise<{
      data: { session: { user: { id: string } } | null }
      error: null
    }> => ({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    })
  )
  const redirect = vi.fn()

  return {
    usePathnameMock: pathname,
    selectMock: select,
    fromMock: from,
    supabaseBrowserClient: supabaseClient,
    createSupabaseBrowserClientMock: createClient,
    getSessionMock: getSession,
    redirectMock: redirect,
    createSupabaseClientMock: createSupabaseClient,
  }
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
  redirect: redirectMock,
}))

vi.mock("@/lib/supabaseClient", () => ({
  supabase: supabaseBrowserClient,
  createSupabaseBrowserClient: () => createSupabaseBrowserClientMock(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getSession: () => getSessionMock(),
    },
  }),
  createSupabaseClient: createSupabaseClientMock,
}))

import DashboardLayout from "./layout"
import DashboardPage from "./page"
import { ThemeProvider } from "@/components/providers/theme-provider"

const renderDashboard = async () => {
  const layout = await DashboardLayout({
    children: <DashboardPage />,
  })

  await act(async () => {
    render(<ThemeProvider>{layout}</ThemeProvider>)
  })
}

const getCardQueries = (summary: HTMLElement, label: string) => {
  const card = within(summary).getByText(label).closest("[data-slot='card']")
  expect(card).not.toBeNull()
  return card ? within(card as HTMLElement) : null
}

describe("Dashboard page", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/dashboard")

    selectMock.mockReset()
    selectMock.mockImplementation(async () => ({
      data: [],
      error: null,
    }))

    fromMock.mockReset()
    fromMock.mockImplementation(() => ({ select: selectMock }))

    createSupabaseBrowserClientMock.mockReset()
    createSupabaseBrowserClientMock.mockImplementation(() => supabaseBrowserClient)

    getSessionMock.mockReset()
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    })

    redirectMock.mockReset()
    createSupabaseClientMock.mockClear()
    selectMock.mockClear()
    fromMock.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("renders the dashboard shell with navigation", async () => {
    let resolveSelect: ((result: SupabaseSelectResult) => void) | null = null
    selectMock.mockImplementationOnce(
      () =>
        new Promise<SupabaseSelectResult>((resolve) => {
          resolveSelect = resolve
        })
    )

    await renderDashboard()

    expect(
      screen.getByRole("navigation", { name: /sidebar navigation/i })
    ).toBeInTheDocument()

    const overviewLink = screen.getByRole("link", { name: "Overview" })
    expect(overviewLink).toHaveAttribute("aria-current", "page")

    expect(
      screen.getByRole("button", { name: /switch to dark theme/i })
    ).toBeInTheDocument()

    expect(
      screen.getByTestId("dashboard-summary-skeleton")
    ).toBeInTheDocument()
    expect(
      screen.getByTestId("top-artists-chart-skeleton")
    ).toBeInTheDocument()
    expect(
      screen.getByTestId("top-tracks-table-skeleton")
    ).toBeInTheDocument()
    expect(
      screen.getByTestId("listening-trends-chart-skeleton")
    ).toBeInTheDocument()
    expect(
      screen.getByTestId("listening-clock-heatmap-skeleton")
    ).toBeInTheDocument()

    expect(resolveSelect).not.toBeNull()

    await act(async () => {
      resolveSelect?.({ data: [], error: null })
    })

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-summary")).toBeInTheDocument()
    })

    expect(
      screen.queryByTestId("dashboard-summary-skeleton")
    ).not.toBeInTheDocument()
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it("replaces the skeleton with stats once data resolves", async () => {
    let resolveSelect: ((result: SupabaseSelectResult) => void) | null = null
    selectMock.mockImplementationOnce(
      () =>
        new Promise<SupabaseSelectResult>((resolve) => {
          resolveSelect = resolve
        })
    )

    await renderDashboard()

    expect(
      screen.getByTestId("dashboard-summary-skeleton")
    ).toBeInTheDocument()

    await act(async () => {
      resolveSelect?.({
        data: [
          {
            ms_played: 3_600_000,
            artist: "Artist B",
            track: "Track 1",
            ts: "2024-01-15T12:00:00.000Z",
          },
          {
            ms_played: 1_800_000,
            artist: "Artist A",
            track: "Track 2",
            ts: "2024-01-20T22:00:00.000Z",
          },
          {
            ms_played: 900_000,
            artist: "Artist A",
            track: "Track 2",
            ts: "2024-01-21T22:00:00.000Z",
          },
          {
            ms_played: 2_400_000,
            artist: "Artist C",
            track: "Track 3",
            ts: "2023-12-25T18:00:00.000Z",
          },
          {
            ms_played: null,
            artist: null,
            track: null,
            ts: null,
          },
        ],
        error: null,
      })
    })

    const summary = await screen.findByTestId("dashboard-summary")
    expect(summary).toBeInTheDocument()

    expect(
      screen.queryByTestId("dashboard-summary-skeleton")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId("top-artists-chart-skeleton")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId("top-tracks-table-skeleton")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId("listening-trends-chart-skeleton")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId("listening-clock-heatmap-skeleton")
    ).not.toBeInTheDocument()

    const expectCardValue = (label: string, value: string) => {
      const cardQueries = getCardQueries(summary, label)
      if (!cardQueries) {
        throw new Error(`Card with label "${label}" was not found`)
      }
      expect(cardQueries.getByText(value)).toBeInTheDocument()
    }

    expectCardValue("Hours listened", "2.4")
    expectCardValue("Artists", "3")
    expectCardValue("Tracks", "3")
    expectCardValue("Top artist", "Artist B")
    expectCardValue("Most active year", "2024")

    expect(
      screen.getByRole("heading", { name: /top artists/i })
    ).toBeInTheDocument()
    expect(screen.getAllByText("Artist B")[0]).toBeInTheDocument()

    expect(screen.getByRole("heading", { name: /top tracks/i })).toBeInTheDocument()
    const tracksTable = screen.getByRole("table")
    expect(within(tracksTable).getByText("Track 1")).toBeInTheDocument()
    expect(within(tracksTable).getByText("1.0 hrs")).toBeInTheDocument()

    expect(
      screen.getByRole("heading", { name: /listening trends/i })
    ).toBeInTheDocument()
    expect(screen.getAllByText(/Jan\s*2024/)).not.toHaveLength(0)
    expect(screen.getAllByText(/Dec\s*2023/)).not.toHaveLength(0)

    expect(
      screen.getByRole("heading", { name: /listening clock/i })
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/Monday at 12:00 — 1.0 hrs/i)
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/Saturday at 22:00 — 0.5 hrs/i)
    ).toBeInTheDocument()
  })

  it("filters dashboard metrics when timeframe changes", async () => {
    selectMock.mockResolvedValueOnce({
      data: [
        {
          ms_played: 4_500_000,
          artist: "Artist 2023",
          track: "Track 2023",
          ts: "2023-11-05T12:00:00.000Z",
        },
        {
          ms_played: 2_400_000,
          artist: "Artist Jan",
          track: "Track Jan",
          ts: "2024-01-10T09:00:00.000Z",
        },
        {
          ms_played: 1_800_000,
          artist: "Artist Jan",
          track: "Track Jan",
          ts: "2024-01-15T11:30:00.000Z",
        },
        {
          ms_played: 1_200_000,
          artist: "Artist Feb",
          track: "Track Feb",
          ts: "2024-02-02T20:00:00.000Z",
        },
      ],
      error: null,
    })

    const user = userEvent.setup()

    await renderDashboard()

    const summary = await screen.findByTestId("dashboard-summary")
    const timeframeButton = screen.getByRole("button", {
      name: /select timeframe/i,
    })

    await waitFor(() => {
      expect(timeframeButton).toBeEnabled()
    })

    expect(timeframeButton).toHaveTextContent(/All time/i)

    const topArtistCard = getCardQueries(summary, "Top artist")
    expect(topArtistCard?.getByText("Artist 2023")).toBeInTheDocument()

    await user.click(timeframeButton)

    const januaryOption = await screen.findByRole("menuitemradio", {
      name: "Jan 2024",
    })
    await user.click(januaryOption)

    await waitFor(() => {
      const cardQueries = getCardQueries(summary, "Top artist")
      expect(cardQueries?.getByText("Artist Jan")).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(timeframeButton).toHaveTextContent(/Jan 2024/i)
    })

    const mostActiveYearCard = getCardQueries(summary, "Most active year")
    expect(mostActiveYearCard?.getByText("2024")).toBeInTheDocument()

    const tracksTable = screen.getByRole("table", {
      name: /ordered by total listening hours/i,
    })
    expect(within(tracksTable).getByText("Track Jan")).toBeInTheDocument()
    expect(within(tracksTable).queryByText("Track 2023")).not.toBeInTheDocument()
  })

  it("shows an unauthorized message when Supabase returns a 401", async () => {
    selectMock.mockResolvedValueOnce({
      data: null,
      error: {
        message: "Unauthorized",
        status: 401,
      },
    })

    await renderDashboard()

    expect(
      await screen.findByText(/sign in to access your audiograph dashboard/i)
    ).toBeInTheDocument()

    expect(
      screen.getByRole("link", { name: /go to sign-in/i })
    ).toHaveAttribute("href", "/sign-in")

    expect(
      screen.queryByTestId("dashboard-summary-skeleton")
    ).not.toBeInTheDocument()
  })
})

describe("Dashboard layout", () => {
  beforeEach(() => {
    getSessionMock.mockReset()
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    })
    redirectMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("redirects to the sign-in page when the session is missing", async () => {
    getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null })

    await DashboardLayout({ children: <div /> })

    expect(redirectMock).toHaveBeenCalledWith("/sign-in")
  })
})
