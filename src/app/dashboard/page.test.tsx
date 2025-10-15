import { render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import Dashboard from "./page"

type ListenRow = {
  ms_played: number | null
  artist: string | null
  track: string | null
}

type SupabaseSelectResult = {
  data: ListenRow[] | null
  error: Error | null
}

const { fromMock, selectMock } = vi.hoisted(() => {
  const localSelectMock = vi.fn(async (): Promise<SupabaseSelectResult> => ({
    data: [] as ListenRow[],
    error: null,
  }))
  const localFromMock = vi.fn(() => ({ select: localSelectMock }))

  return {
    fromMock: localFromMock,
    selectMock: localSelectMock,
  }
})

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: fromMock,
  },
}))

describe("Dashboard", () => {
  beforeEach(() => {
    fromMock.mockClear()
    selectMock.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders listening summary stats once data resolves", async () => {
    selectMock.mockResolvedValueOnce({
      data: [
        { ms_played: 3_600_000, artist: "Artist A", track: "Track 1" },
        { ms_played: 7_200_000, artist: "Artist B", track: "Track 2" },
        { ms_played: null, artist: "Artist B", track: null },
        { ms_played: 900_000, artist: "Artist A", track: null },
      ] as ListenRow[],
      error: null,
    })

    render(<Dashboard />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    await waitFor(() =>
      expect(selectMock).toHaveBeenCalledWith("ms_played, artist, track")
    )

    const summaryHeading = await screen.findByRole("heading", {
      name: "Your Listening Summary",
    })
    expect(summaryHeading).toBeVisible()

    const hoursCard = screen.getByText("Hours").parentElement as HTMLElement
    const artistsCard = screen.getByText("Artists").parentElement as HTMLElement
    const tracksCard = screen.getByText("Tracks").parentElement as HTMLElement

    expect(hoursCard).toBeTruthy()
    expect(artistsCard).toBeTruthy()
    expect(tracksCard).toBeTruthy()

    expect(within(hoursCard).getByText("3.3")).toBeInTheDocument()
    expect(within(artistsCard).getByText("2")).toBeInTheDocument()
    expect(within(tracksCard).getByText("2")).toBeInTheDocument()
  })

  it("logs and leaves loading state when Supabase returns an error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    selectMock.mockResolvedValueOnce({
      data: null,
      error: new Error("boom"),
    })

    render(<Dashboard />)

    await waitFor(() => expect(selectMock).toHaveBeenCalled())
    await waitFor(() => expect(consoleSpy).toHaveBeenCalled())

    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
