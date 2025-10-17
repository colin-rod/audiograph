/**
 * TypeScript types for analytics RPC functions and aggregated data
 * These types match the SQL functions defined in the analytics migration
 */

// ============================================================================
// RPC Function Response Types
// ============================================================================

export type DashboardSummaryResponse = {
  total_hours: string | null
  unique_artists: number
  unique_tracks: number
  total_listens: number
  top_artist: string | null
  most_active_year: string | null
}

export type TopArtistResponse = {
  artist: string
  total_hours: string
  listen_count: number
}

export type TopTrackResponse = {
  track: string
  artist: string | null
  total_hours: string
  listen_count: number
}

export type ListeningTrendResponse = {
  month: string
  total_hours: string
  listen_count: number
}

export type WeeklyListeningTrendResponse = {
  week_start: string
  week_end: string
  week_number: number
  year: number
  total_hours: string
  listen_count: number
}

export type ListeningClockResponse = {
  day_of_week: number
  hour_of_day: number
  total_hours: string
  listen_count: number
}

export type ListeningHistoryResponse = {
  track: string | null
  artist: string | null
  ts: string
  ms_played: number | null
  total_count: number
}

export type ListeningStreakResponse = {
  longest_streak: number | null
  longest_streak_start: string | null
  longest_streak_end: string | null
  current_streak: number | null
  current_streak_start: string | null
  current_streak_end: string | null
}

export type TimeframeResponse = {
  year: number
  month: number
  listen_count: number
  total_hours: string
}

// ============================================================================
// Client-Side Data Types (after transformation)
// ============================================================================

export type DashboardStats = {
  totalHours: string
  artists: number
  tracks: number
  topArtist: string | null
  mostActiveYear: string | null
}

export type TopArtistDatum = {
  name: string
  hours: number
}

export type TopTrackDatum = {
  track: string
  artist: string | null
  hours: number
}

export type ListeningTrendDatum = {
  month: string
  label: string
  hours: number
}

export type WeeklyListeningTrendDatum = {
  weekStart: string
  weekEnd: string
  weekNumber: number
  year: number
  label: string
  description: string
  hours: number
}

export type ListeningClockDatum = {
  day: number
  hour: number
  hours: number
}

export type ListeningStreakStats = {
  longestStreak: number
  longestStreakStart: string | null
  longestStreakEnd: string | null
  currentStreak: number
  currentStreakStart: string | null
  currentStreakEnd: string | null
}

export type ListeningHistoryDatum = {
  track: string | null
  artist: string | null
  ts: string
  ms_played: number | null
}

export type TimeframeData = {
  year: number
  month: number
  listenCount: number
  totalHours: number
}

// ============================================================================
// RPC Function Parameters
// ============================================================================

export type TimeWindowParams = {
  start_date?: string | null
  end_date?: string | null
}

export type PaginationParams = {
  limit_count?: number
  offset_count?: number
}

export type TopArtistsParams = TimeWindowParams & PaginationParams

export type TopTracksParams = TimeWindowParams & PaginationParams

export type ListeningHistoryParams = TimeWindowParams &
  PaginationParams & {
    search_query?: string | null
  }

// ============================================================================
// Helper Types
// ============================================================================

export type TimeframeType = "all" | "year" | "month"

export type TimeframeFilter =
  | { type: "all" }
  | { type: "year"; year: number }
  | { type: "month"; year: number; month: number }

// ============================================================================
// Transformation Utilities
// ============================================================================

/**
 * Transform database response to client format
 */
export const transformDashboardSummary = (
  data: DashboardSummaryResponse
): DashboardStats => ({
  totalHours: data.total_hours ?? "0.0",
  artists: data.unique_artists,
  tracks: data.unique_tracks,
  topArtist: data.top_artist,
  mostActiveYear: data.most_active_year,
})

export const transformTopArtist = (data: TopArtistResponse): TopArtistDatum => ({
  name: data.artist,
  hours: Number(data.total_hours),
})

export const transformTopTrack = (data: TopTrackResponse): TopTrackDatum => ({
  track: data.track,
  artist: data.artist,
  hours: Number(data.total_hours),
})

export const transformListeningTrend = (
  data: ListeningTrendResponse
): ListeningTrendDatum => {
  const date = new Date(data.month)
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  })

  return {
    month: data.month,
    label: formatter.format(date),
    hours: Number(data.total_hours),
  }
}

export const transformWeeklyListeningTrend = (
  data: WeeklyListeningTrendResponse
): WeeklyListeningTrendDatum => {
  const weekStartDate = new Date(data.week_start)
  const weekEndDate = new Date(data.week_end)

  const axisFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  })

  const detailFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  const startLabel = axisFormatter.format(weekStartDate)
  const endLabel = axisFormatter.format(weekEndDate)
  const description = `${detailFormatter.format(weekStartDate)} – ${detailFormatter.format(weekEndDate)}`

  return {
    weekStart: data.week_start,
    weekEnd: data.week_end,
    weekNumber: data.week_number,
    year: data.year,
    label: `${startLabel} – ${endLabel}`,
    description,
    hours: Number(data.total_hours),
  }
}

export const transformListeningClock = (
  data: ListeningClockResponse
): ListeningClockDatum => ({
  day: data.day_of_week,
  hour: data.hour_of_day,
  hours: Number(data.total_hours),
})

export const transformListeningStreak = (
  data: ListeningStreakResponse
): ListeningStreakStats => ({
  longestStreak: data.longest_streak ?? 0,
  longestStreakStart: data.longest_streak_start,
  longestStreakEnd: data.longest_streak_end,
  currentStreak: data.current_streak ?? 0,
  currentStreakStart: data.current_streak_start,
  currentStreakEnd: data.current_streak_end,
})

export const transformListeningHistory = (
  data: ListeningHistoryResponse
): ListeningHistoryDatum => ({
  track: data.track,
  artist: data.artist,
  ts: data.ts,
  ms_played: data.ms_played,
})

export const transformTimeframe = (data: TimeframeResponse): TimeframeData => ({
  year: data.year,
  month: data.month,
  listenCount: data.listen_count,
  totalHours: Number(data.total_hours),
})

/**
 * Convert TimeframeFilter to time window parameters
 */
export const timeframeToParams = (filter: TimeframeFilter): TimeWindowParams => {
  if (filter.type === "all") {
    return { start_date: null, end_date: null }
  }

  if (filter.type === "year") {
    return {
      start_date: new Date(filter.year, 0, 1).toISOString(),
      end_date: new Date(filter.year + 1, 0, 1).toISOString(),
    }
  }

  // month type
  return {
    start_date: new Date(filter.year, filter.month - 1, 1).toISOString(),
    end_date: new Date(filter.year, filter.month, 1).toISOString(),
  }
}
