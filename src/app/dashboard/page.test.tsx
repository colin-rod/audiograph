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
  useRouterMock,
  pushMock,
  selectMock,
  fromMock,
  supabaseBrowserClient,
  createSupabaseBrowserClientMock,
  getSessionMock,
  redirectMock,
  createSupabaseClientMock,
  getUserMock,
  onAuthStateChangeMock,
  unsubscribeMock,
  useShareCardExportMock,
  exportCardMock,
  resetShareCardExportMock,
} = vi.hoisted(() => {
  const pathname = vi.fn<() => string>(() => "/dashboard")
  const select = vi.fn(async (): Promise<SupabaseSelectResult> => ({
    data: [],
    error: null,
  }))
  const getUser = vi.fn(async () => ({
    data: { user: { id: "user-1", email: "user@example.com" } },
    error: null,
  }))
  const getClientSession = vi.fn(async () => ({
    data: { session: { user: { id: "user-1" } } },
    error: null,
  }))
  const unsubscribe = vi.fn()
  const onAuthStateChange = vi.fn(() => ({
    data: {
      subscription: {
        unsubscribe,
      },
    },
  }))
  const from = vi.fn(() => ({ select }))
  const supabaseClient = {
    from,
    auth: {
      getUser,
      onAuthStateChange,
      getSession: getClientSession,
    },
  }
  const createClient = vi.fn(() => supabaseClient)
  const createSupabaseClient = vi.fn(() => ({
    from,
    auth: {
      getSession: getClientSession,
    },
  }))
  const push = vi.fn()
  const useRouter = vi.fn(() => ({
    push,
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
  const exportCard = vi.fn<
    (args: {
      node: HTMLElement | null
      filename: string
      format: "png" | "svg" | "clipboard" | "share"
    }) => Promise<void>
  >()
  const resetExport = vi.fn()
  const useShareCardExport = vi.fn(() => ({
    exportCard,
    isExporting: false,
    status: "idle" as const,
    error: null,
    lastFilename: null,
    lastExportFormat: null,
    reset: resetExport,
    canCopyToClipboard: true,
    canShare: true,
  }))

  return {
    usePathnameMock: pathname,
    useRouterMock: useRouter,
    pushMock: push,
    selectMock: select,
    fromMock: from,
    supabaseBrowserClient: supabaseClient,
    createSupabaseBrowserClientMock: createClient,
    getSessionMock: getSession,
    redirectMock: redirect,
    createSupabaseClientMock: createSupabaseClient,
    getUserMock: getUser,
    onAuthStateChangeMock: onAuthStateChange,
    unsubscribeMock: unsubscribe,
    useShareCardExportMock: useShareCardExport,
    exportCardMock: exportCard,
    resetShareCardExportMock: resetExport,
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
  useRouter: () => useRouterMock(),
  redirect: redirectMock,
}))

vi.mock("@/lib/supabaseClient", () => ({
  supabase: supabaseBrowserClient,
  createSupabaseBrowserClient: () => createSupabaseBrowserClientMock(),
  createSupabaseClient: () => createSupabaseClientMock(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getSession: () => getSessionMock(),
    },
  }),
  createSupabaseClient: createSupabaseClientMock,
}))

vi.mock("@/components/dashboard/share-cards/use-share-card-export", () => ({
  useShareCardExport: () => useShareCardExportMock(),
}))

import DashboardLayout from "./layout"
import DashboardPage from "./page"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { __analyticsFallback } from "@/lib/analytics-service"

const renderDashboard = async () => {
  const layout = await DashboardLayout({
    children: <DashboardPage />,
  })

  await act(async () => {
    render(<ThemeProvider>{layout}</ThemeProvider>)
  })
}

const primeSelectWithData = (rows: ListenRow[]) => {
  selectMock.mockImplementationOnce(async () => ({ data: rows, error: null }))
  selectMock.mockImplementationOnce(async () => ({ data: rows, error: null }))
}

const getCardQueries = (summary: HTMLElement, label: string) => {
  const card = within(summary).getByText(label).closest("[data-slot='card']")
  expect(card).not.toBeNull()
  return card ? within(card as HTMLElement) : null
}

describe("Dashboard page", () => {
  beforeEach(() => {
    __analyticsFallback.resetCaches()
    usePathnameMock.mockReturnValue("/dashboard")
    pushMock.mockReset()
    useRouterMock.mockReset()
    useRouterMock.mockImplementation(() => ({
      push: pushMock,
    }))

    selectMock.mockReset()
    selectMock.mockImplementation(async () => ({
      data: [],
      error: null,
    }))

    fromMock.mockReset()
    fromMock.mockImplementation(() => ({ select: selectMock }))

    getUserMock.mockReset()
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
      error: null,
    })

    unsubscribeMock.mockReset()
    onAuthStateChangeMock.mockReset()
    onAuthStateChangeMock.mockImplementation(() => ({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    }))

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
    useShareCardExportMock.mockReset()
    exportCardMock.mockReset()
    resetShareCardExportMock.mockReset()
    useShareCardExportMock.mockImplementation(() => ({
      exportCard: exportCardMock,
      isExporting: false,
      status: "idle" as const,
      error: null,
      lastFilename: null,
      lastExportFormat: null,
      canCopyToClipboard: true,
      canShare: true,
      reset: resetShareCardExportMock,
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("renders the dashboard shell with navigation", async () => {
    const pendingSelects: ((result: SupabaseSelectResult) => void)[] = []
    selectMock.mockImplementationOnce(
      () =>
        new Promise<SupabaseSelectResult>((resolve) => {
          pendingSelects.push(resolve)
        })
    )
    selectMock.mockImplementationOnce(
      () =>
        new Promise<SupabaseSelectResult>((resolve) => {
          pendingSelects.push(resolve)
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
      screen.getByTestId("discovery-tracker-skeleton")
    ).toBeInTheDocument()
    expect(
      screen.getByTestId("loyalty-gauge-skeleton")
    ).toBeInTheDocument()
    expect(
      screen.getByTestId("listening-trends-chart-skeleton")
    ).toBeInTheDocument()
    expect(
      screen.getByTestId("weekly-cadence-chart-skeleton")
    ).toBeInTheDocument()
    expect(
      screen.getByTestId("listening-clock-heatmap-skeleton")
    ).toBeInTheDocument()
    expect(
      screen.getByTestId("listening-streak-card-skeleton")
    ).toBeInTheDocument()
    expect(
      screen.getByTestId("listening-history-skeleton")
    ).toBeInTheDocument()

    expect(pendingSelects.length).toBeGreaterThan(0)

    await act(async () => {
      pendingSelects.forEach((resolve) => resolve({ data: [], error: null }))
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
    const pendingSelects: ((result: SupabaseSelectResult) => void)[] = []
    selectMock.mockImplementationOnce(
      () =>
        new Promise<SupabaseSelectResult>((resolve) => {
          pendingSelects.push(resolve)
        })
    )
    selectMock.mockImplementationOnce(
      () =>
        new Promise<SupabaseSelectResult>((resolve) => {
          pendingSelects.push(resolve)
        })
    )

    await renderDashboard()

    expect(
      screen.getByTestId("dashboard-summary-skeleton")
    ).toBeInTheDocument()

    await act(async () => {
      pendingSelects.forEach((resolve) =>
        resolve({
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
      )
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
      screen.queryByTestId("discovery-tracker-skeleton")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId("loyalty-gauge-skeleton")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId("listening-trends-chart-skeleton")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId("listening-clock-heatmap-skeleton")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId("listening-history-skeleton")
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /search your listening history/i })
    ).toBeInTheDocument()

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
    expect(
      screen.getByRole("heading", { name: /artist & track deep dives/i })
    ).toBeInTheDocument()
    const tracksTable = screen.getByRole("table", {
      name: /ordered by total listening hours/i,
    })
    expect(within(tracksTable).getByText("Track 1")).toBeInTheDocument()
    expect(within(tracksTable).getByText("1.0 hrs")).toBeInTheDocument()

    expect(
      screen.getByRole("heading", { name: /listening trends/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /weekly cadence/i })
    ).toBeInTheDocument()
    expect(screen.getAllByText(/Jan\s*2024/)).not.toHaveLength(0)
    expect(screen.getAllByText(/Dec\s*2023/)).not.toHaveLength(0)

    expect(
      screen.getByRole("heading", { name: /listening clock/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /listening streaks/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /discovery tracker/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /loyalty gauge/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /no tracks have crossed the 5-play mark yet in this timeframe/i
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /time-based insights/i })
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/Monday at 12:00 — 1.0 hrs/i)
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/Saturday at 22:00 — 0.5 hrs/i)
    ).toBeInTheDocument()
  })

  it("filters dashboard metrics when timeframe changes", async () => {
    primeSelectWithData([
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
    ])

    const user = userEvent.setup()

    await renderDashboard()

    await screen.findByTestId("dashboard-summary")
    const timeframeButton = screen.getByRole("button", {
      name: /select timeframe/i,
    })

    await waitFor(() => {
      expect(timeframeButton).toBeEnabled()
    })

    expect(timeframeButton).toHaveTextContent(/All time/i)

    let summary = screen.getByTestId("dashboard-summary")
    const topArtistCard = getCardQueries(summary, "Top artist")
    expect(topArtistCard?.getByText("Artist 2023")).toBeInTheDocument()

    await user.click(timeframeButton)

    const januaryOption = await screen.findByRole("menuitemradio", {
      name: "Jan 2024",
    })
    await user.click(januaryOption)

    await waitFor(() => {
      summary = screen.getByTestId("dashboard-summary")
      const cardQueries = getCardQueries(summary, "Top artist")
      expect(cardQueries?.getByText("Artist Jan")).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(timeframeButton).toHaveTextContent(/Jan 2024/i)
    })

    summary = screen.getByTestId("dashboard-summary")
    const mostActiveYearCard = getCardQueries(summary, "Most active year")
    expect(mostActiveYearCard?.getByText("2024")).toBeInTheDocument()

    const tracksTable = screen.getByRole("table", {
      name: /ordered by total listening hours/i,
    })
    expect(within(tracksTable).getByText("Track Jan")).toBeInTheDocument()
    expect(within(tracksTable).queryByText("Track 2023")).not.toBeInTheDocument()
  })

  it("lets users search their listening history by song and time range", async () => {
    primeSelectWithData([
      {
        ms_played: 2_400_000,
        artist: "Artist Alpha",
        track: "Track One",
        ts: "2024-03-11T10:00:00.000Z",
      },
      {
        ms_played: 1_200_000,
        artist: "Artist Beta",
        track: "Track Two",
        ts: "2024-03-12T15:30:00.000Z",
      },
      {
        ms_played: 3_000_000,
        artist: "Artist Gamma",
        track: "Track Three",
        ts: "2024-03-13T21:15:00.000Z",
      },
    ])

    const user = userEvent.setup()

    await renderDashboard()

    await screen.findByRole("heading", { name: /search your listening history/i })

    const searchInput = screen.getByLabelText(/search songs or artists/i)
    const historyTable = screen.getByRole("table", {
      name: /listening history results/i,
    })
    expect(searchInput).toHaveValue("")

    await user.type(searchInput, "Artist Beta")

    await waitFor(() => {
      expect(within(historyTable).getByText("Track Two")).toBeInTheDocument()
    })
    expect(within(historyTable).queryByText("Track One")).not.toBeInTheDocument()
    expect(screen.getByText(/Showing 1 of 1 play/i)).toBeInTheDocument()

    await user.clear(searchInput)

    await waitFor(() => {
      expect(within(historyTable).getByText("Track One")).toBeInTheDocument()
      expect(within(historyTable).getByText("Track Three")).toBeInTheDocument()
    })

    const fromInput = screen.getByLabelText(/^From$/i)
    await user.type(fromInput, "2025-01-01T00:00")

    await waitFor(() => {
      expect(
        screen.getByText(
          /No plays match your current filters. Try broadening your search or removing the time range./i
        )
      ).toBeInTheDocument()
      expect(screen.getByText(/Showing 0 of 0 plays/i)).toBeInTheDocument()
    })

    const toInput = screen.getByLabelText(/^To$/i)
    await user.type(toInput, "2024-01-01T00:00")

    await waitFor(() => {
      expect(
        screen.getByText(/The start of your range must be before the end time./i)
      ).toBeInTheDocument()
    })
  })

  it("shows share cards control once insights load and triggers export", async () => {
    const pendingSelects: ((result: SupabaseSelectResult) => void)[] = []
    selectMock.mockImplementationOnce(
      () =>
        new Promise<SupabaseSelectResult>((resolve) => {
          pendingSelects.push(resolve)
        })
    )
    selectMock.mockImplementationOnce(
      () =>
        new Promise<SupabaseSelectResult>((resolve) => {
          pendingSelects.push(resolve)
        })
    )

    const user = userEvent.setup()

    await renderDashboard()

    const initialShareButton = screen.getByRole("button", { name: /share cards/i })
    expect(initialShareButton).toBeDisabled()

    await act(async () => {
      pendingSelects.forEach((resolve) =>
        resolve({
          data: [
            {
              ms_played: 3_600_000,
              artist: "Artist Alpha",
              track: "Track One",
              ts: "2024-01-10T12:00:00.000Z",
            },
            {
              ms_played: 2_400_000,
              artist: "Artist Beta",
              track: "Track Two",
              ts: "2024-01-12T18:00:00.000Z",
            },
            {
              ms_played: 1_800_000,
              artist: "Artist Alpha",
              track: "Track Two",
              ts: "2024-01-15T20:00:00.000Z",
            },
            {
              ms_played: 900_000,
              artist: "Artist Gamma",
              track: "Track Three",
              ts: "2024-01-20T09:00:00.000Z",
            },
          ],
          error: null,
        })
      )
    })

    const shareButton = await screen.findByRole("button", { name: /share cards/i })
    expect(shareButton).toBeEnabled()

    await user.click(shareButton)

    const dialog = await screen.findByRole("dialog", {
      name: /share your top insights/i,
    })
    expect(dialog).toBeInTheDocument()

    const downloadArtistsPng = within(dialog).getByRole("button", {
      name: /download artists png/i,
    })
    await user.click(downloadArtistsPng)

    expect(exportCardMock).toHaveBeenCalled()
    const firstCallArgs = exportCardMock.mock.calls[0]?.[0]
    expect(firstCallArgs?.format).toBe("png")
    expect(firstCallArgs?.filename).toContain("top-artists")

    const downloadTracksSvg = within(dialog).getByRole("button", {
      name: /download tracks svg/i,
    })
    await user.click(downloadTracksSvg)

    const svgCall = exportCardMock.mock.calls.find(
      ([args]) => args?.format === "svg"
    )
    expect(svgCall?.[0]?.filename).toContain("top-tracks")
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
