import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ListeningClockHeatmap } from "../listening-clock-heatmap"
import { ListeningTrendsChart } from "../listening-trends-chart"
import { TopArtistsChart } from "../top-artists-chart"
import { TopTracksTable } from "../top-tracks-table"

describe("Dashboard chart components", () => {
  it("renders the top artists chart with axis labels and accessible text", () => {
    render(
      <TopArtistsChart
        data={[
          { name: "Artist A", hours: 1.5 },
          { name: "Artist B", hours: 1.2 },
        ]}
      />
    )

    expect(
      screen.getByRole("heading", { name: /top artists/i })
    ).toBeInTheDocument()
    expect(screen.getByText("Artist A")).toBeInTheDocument()
    expect(screen.getByText("Artist B")).toBeInTheDocument()
    expect(screen.getByText("Artist A: 1.5 hrs")).toBeInTheDocument()
  })

  it("renders a table of top tracks", () => {
    render(
      <TopTracksTable
        data={[
          { track: "Track 1", artist: "Artist A", hours: 2.4 },
          { track: "Track 2", artist: null, hours: 1.1 },
        ]}
      />
    )

    expect(screen.getByRole("heading", { name: /top tracks/i })).toBeInTheDocument()
    const table = screen.getByRole("table")
    expect(table).toBeInTheDocument()
    expect(screen.getByText("Track 1")).toBeInTheDocument()
    expect(screen.getByText("Artist A")).toBeInTheDocument()
    expect(screen.getByText("2.4 hrs")).toBeInTheDocument()
    expect(screen.getByText("Track 2")).toBeInTheDocument()
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("renders the listening trends chart with month labels", () => {
    render(
      <ListeningTrendsChart
        data={[
          { month: "2023-12", label: "Dec 2023", hours: 0.5 },
          { month: "2024-01", label: "Jan 2024", hours: 1.2 },
        ]}
      />
    )

    expect(
      screen.getByRole("heading", { name: /listening trends/i })
    ).toBeInTheDocument()
    expect(screen.getByText("Dec 2023")).toBeInTheDocument()
    expect(screen.getByText("Jan 2024")).toBeInTheDocument()
    expect(screen.getByText("Dec 2023: 0.5 hrs")).toBeInTheDocument()
  })

  it("renders the listening clock heatmap with accessible cells", () => {
    render(
      <ListeningClockHeatmap
        data={[
          { day: 0, hour: 9, hours: 0.5 },
          { day: 2, hour: 18, hours: 1.3 },
        ]}
      />
    )

    expect(
      screen.getByRole("heading", { name: /listening clock/i })
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/Sunday at 9:00 — 0.5 hrs/i)
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/Tuesday at 18:00 — 1.3 hrs/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/low/i)).toBeInTheDocument()
    expect(screen.getByText(/high/i)).toBeInTheDocument()
  })
})
