/**
 * Analytics Service
 * Provides high-level functions to fetch aggregated analytics data
 * using Supabase RPC functions for efficient server-side aggregation
 */

import { SupabaseClient } from "@supabase/supabase-js"
import type {
  DashboardStats,
  DashboardSummaryResponse,
  ListeningClockDatum,
  ListeningClockResponse,
  ListeningHistoryDatum,
  ListeningHistoryParams,
  ListeningHistoryResponse,
  ListeningStreakResponse,
  ListeningTrendDatum,
  ListeningTrendResponse,
  DiscoveryTrackerDatum,
  PaginationParams,
  TimeframeData,
  TimeframeFilter,
  TimeframeResponse,
  TimeWindowParams,
  TopArtistDatum,
  TopArtistResponse,
  TopArtistsParams,
  TopTrackDatum,
  TopTrackResponse,
  TopTracksParams,
  LoyaltyGaugeData,
  LoyaltyTrendDatum,
  TopRepeatTrackDatum,
  WeeklyListeningTrendDatum,
  WeeklyListeningTrendResponse,
} from "./analytics-types"
import {
  transformDashboardSummary,
  transformListeningClock,
  transformListeningHistory,
  transformListeningStreak,
  transformListeningTrend,
  transformTimeframe,
  transformTopArtist,
  transformTopTrack,
  transformWeeklyListeningTrend,
  timeframeToParams,
} from "./analytics-types"

// ============================================================================
// Error Handling
// ============================================================================

export class AnalyticsError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = "AnalyticsError"
    if (
      details &&
      typeof details === "object" &&
      "status" in details &&
      typeof (details as { status?: unknown }).status === "number"
    ) {
      this.status = (details as { status: number }).status
    }
  }

  public readonly status?: number
}

type AnalyticsResult<T> =
  | { success: true; data: T }
  | { success: false; error: AnalyticsError }

type ListenRow = {
  ms_played: number | null
  artist: string | null
  track: string | null
  ts: string | null
}

type ValidListen = {
  ms: number
  artist: string | null
  track: string | null
  ts: Date
}

const MS_PER_HOUR = 3_600_000

const hasRpc = (
  supabase: SupabaseClient
): supabase is SupabaseClient & { rpc: SupabaseClient["rpc"] } =>
  typeof (supabase as { rpc?: SupabaseClient["rpc"] }).rpc === "function"

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
})

const formatMonthLabel = (year: number, month: number) =>
  MONTH_LABEL_FORMATTER.format(new Date(Date.UTC(year, month - 1, 1)))

// ============================================================================
// Core Analytics Functions
// ============================================================================

/**
 * Fetch dashboard summary statistics
 */
export async function getDashboardSummary(
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<DashboardStats>> {
  if (!hasRpc(supabase)) {
    return getDashboardSummaryFallback(supabase, params)
  }
  try {
    const { data, error } = await supabase.rpc("get_dashboard_summary", {
      start_date: params.start_date ?? null,
      end_date: params.end_date ?? null,
    })

    if (error) {
      return {
        success: false,
        error: new AnalyticsError(
          "Failed to fetch dashboard summary",
          error.code,
          error
        ),
      }
    }

    // RPC returns array with single row
    const row = (data as DashboardSummaryResponse[])?.[0]
    if (!row) {
      return {
        success: false,
        error: new AnalyticsError("No data returned from dashboard summary"),
      }
    }

    return {
      success: true,
      data: transformDashboardSummary(row),
    }
  } catch (error) {
    return {
      success: false,
      error: new AnalyticsError(
        "Unexpected error fetching dashboard summary",
        undefined,
        error
      ),
    }
  }
}

/**
 * Fetch top artists
 */
export async function getTopArtists(
  supabase: SupabaseClient,
  params: TopArtistsParams = {}
): Promise<AnalyticsResult<TopArtistDatum[]>> {
  if (!hasRpc(supabase)) {
    return getTopArtistsFallback(supabase, params)
  }
  try {
    const { data, error } = await supabase.rpc("get_top_artists", {
      start_date: params.start_date ?? null,
      end_date: params.end_date ?? null,
      limit_count: params.limit_count ?? 5,
      offset_count: params.offset_count ?? 0,
    })

    if (error) {
      return {
        success: false,
        error: new AnalyticsError("Failed to fetch top artists", error.code, error),
      }
    }

    const rows = (data as TopArtistResponse[]) ?? []
    return {
      success: true,
      data: rows.map(transformTopArtist),
    }
  } catch (error) {
    return {
      success: false,
      error: new AnalyticsError(
        "Unexpected error fetching top artists",
        undefined,
        error
      ),
    }
  }
}

/**
 * Fetch top tracks
 */
export async function getTopTracks(
  supabase: SupabaseClient,
  params: TopTracksParams = {}
): Promise<AnalyticsResult<TopTrackDatum[]>> {
  if (!hasRpc(supabase)) {
    return getTopTracksFallback(supabase, params)
  }
  try {
    const { data, error } = await supabase.rpc("get_top_tracks", {
      start_date: params.start_date ?? null,
      end_date: params.end_date ?? null,
      limit_count: params.limit_count ?? 5,
      offset_count: params.offset_count ?? 0,
    })

    if (error) {
      return {
        success: false,
        error: new AnalyticsError("Failed to fetch top tracks", error.code, error),
      }
    }

    const rows = (data as TopTrackResponse[]) ?? []
    return {
      success: true,
      data: rows.map(transformTopTrack),
    }
  } catch (error) {
    return {
      success: false,
      error: new AnalyticsError(
        "Unexpected error fetching top tracks",
        undefined,
        error
      ),
    }
  }
}

/**
 * Fetch listening trends by month
 */
export async function getListeningTrends(
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<ListeningTrendDatum[]>> {
  if (!hasRpc(supabase)) {
    return getListeningTrendsFallback(supabase, params)
  }
  try {
    const { data, error } = await supabase.rpc("get_listening_trends", {
      start_date: params.start_date ?? null,
      end_date: params.end_date ?? null,
    })

    if (error) {
      return {
        success: false,
        error: new AnalyticsError(
          "Failed to fetch listening trends",
          error.code,
          error
        ),
      }
    }

    const rows = (data as ListeningTrendResponse[]) ?? []
    return {
      success: true,
      data: rows.map(transformListeningTrend),
    }
  } catch (error) {
    return {
      success: false,
      error: new AnalyticsError(
        "Unexpected error fetching listening trends",
        undefined,
        error
      ),
    }
  }
}

/**
 * Fetch listening cadence grouped by ISO week
 */
export async function getWeeklyListeningTrends(
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<WeeklyListeningTrendDatum[]>> {
  if (!hasRpc(supabase)) {
    return getWeeklyListeningTrendsFallback(supabase, params)
  }
  try {
    const { data, error } = await supabase.rpc("get_weekly_listening_trends", {
      start_date: params.start_date ?? null,
      end_date: params.end_date ?? null,
    })

    if (error) {
      return {
        success: false,
        error: new AnalyticsError(
          "Failed to fetch weekly listening trends",
          error.code,
          error
        ),
      }
    }

    const rows = (data as WeeklyListeningTrendResponse[]) ?? []
    return {
      success: true,
      data: rows.map(transformWeeklyListeningTrend),
    }
  } catch (error) {
    return {
      success: false,
      error: new AnalyticsError(
        "Unexpected error fetching weekly listening trends",
        undefined,
        error
      ),
    }
  }
}

/**
 * Fetch listening clock heatmap data
 */
export async function getListeningClock(
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<ListeningClockDatum[]>> {
  if (!hasRpc(supabase)) {
    return getListeningClockFallback(supabase, params)
  }
  try {
    const { data, error } = await supabase.rpc("get_listening_clock", {
      start_date: params.start_date ?? null,
      end_date: params.end_date ?? null,
    })

    if (error) {
      return {
        success: false,
        error: new AnalyticsError(
          "Failed to fetch listening clock",
          error.code,
          error
        ),
      }
    }

    const rows = (data as ListeningClockResponse[]) ?? []
    return {
      success: true,
      data: rows.map(transformListeningClock),
    }
  } catch (error) {
    return {
      success: false,
      error: new AnalyticsError(
        "Unexpected error fetching listening clock",
        undefined,
        error
      ),
    }
  }
}

/**
 * Fetch first-time artist and track discovery counts by month
 */
export async function getDiscoveryTracker(
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<DiscoveryTrackerDatum[]>> {
  if (!hasRpc(supabase)) {
    return getDiscoveryTrackerFallback(supabase, params)
  }

  type DiscoveryTrackerResponse = {
    month: string
    new_artists: number
    new_tracks: number
  }

  try {
    const { data, error } = await supabase.rpc("get_discovery_tracker", {
      start_date: params.start_date ?? null,
      end_date: params.end_date ?? null,
    })

    if (error) {
      if (error.code === "PGRST116") {
        return getDiscoveryTrackerFallback(supabase, params)
      }

      return {
        success: false,
        error: new AnalyticsError(
          "Failed to fetch discovery tracker",
          error.code,
          error
        ),
      }
    }

    const rows = (data as DiscoveryTrackerResponse[] | null) ?? []

    const transformed = rows
      .map((row) => {
        const [yearStr, monthStr] = row.month.split("-")
        const year = Number(yearStr)
        const month = Number(monthStr)

        if (!Number.isFinite(year) || !Number.isFinite(month)) {
          return null
        }

        return {
          month: row.month,
          label: formatMonthLabel(year, month),
          newArtists: row.new_artists,
          newTracks: row.new_tracks,
        }
      })
      .filter((value): value is DiscoveryTrackerDatum => value !== null)

    return {
      success: true,
      data: transformed,
    }
  } catch (error) {
    return getDiscoveryTrackerFallback(supabase, params)
  }
}

/**
 * Fetch loyalty metrics for repeat listens
 */
export async function getLoyaltyGauge(
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<LoyaltyGaugeData>> {
  if (!hasRpc(supabase)) {
    return getLoyaltyGaugeFallback(supabase, params)
  }

  type LoyaltyGaugeResponse = {
    month: string
    repeat_listen_share: number
    repeat_listen_count: number
    total_listen_count: number
    threshold: number
    top_tracks: TopRepeatTrackDatum[]
  }

  try {
    const { data, error } = await supabase.rpc("get_loyalty_gauge", {
      start_date: params.start_date ?? null,
      end_date: params.end_date ?? null,
    })

    if (error) {
      if (error.code === "PGRST116") {
        return getLoyaltyGaugeFallback(supabase, params)
      }

      return {
        success: false,
        error: new AnalyticsError(
          "Failed to fetch loyalty gauge",
          error.code,
          error
        ),
      }
    }

    const rows = (data as LoyaltyGaugeResponse[] | null) ?? []

    if (!rows.length) {
      return {
        success: true,
        data: {
          threshold: 5,
          monthly: [],
          topRepeatTracks: [],
        },
      }
    }

    const threshold = rows[0]?.threshold ?? 5

    const monthly: LoyaltyTrendDatum[] = rows
      .map((row) => {
        const [yearStr, monthStr] = row.month.split("-")
        const year = Number(yearStr)
        const month = Number(monthStr)

        if (!Number.isFinite(year) || !Number.isFinite(month)) {
          return null
        }

        return {
          month: row.month,
          label: formatMonthLabel(year, month),
          repeatListenShare: row.repeat_listen_share,
          repeatListenCount: row.repeat_listen_count,
          totalListenCount: row.total_listen_count,
        }
      })
      .filter((value): value is LoyaltyTrendDatum => value !== null)

    const topRepeatTracks = rows[0]?.top_tracks ?? []

    return {
      success: true,
      data: {
        threshold,
        monthly,
        topRepeatTracks,
      },
    }
  } catch (error) {
    return getLoyaltyGaugeFallback(supabase, params)
  }
}

/**
 * Fetch listening streak statistics
 */
export async function getListeningStreaks(
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<ReturnType<typeof transformListeningStreak>>> {
  if (!hasRpc(supabase)) {
    return getListeningStreaksFallback(supabase, params)
  }
  try {
    const { data, error } = await supabase.rpc("get_listening_streaks", {
      start_date: params.start_date ?? null,
      end_date: params.end_date ?? null,
    })

    if (error) {
      return {
        success: false,
        error: new AnalyticsError(
          "Failed to fetch listening streaks",
          error.code,
          error
        ),
      }
    }

    const row = (data as ListeningStreakResponse[] | null)?.[0]

    if (!row) {
      return {
        success: true,
        data: transformListeningStreak({
          longest_streak: 0,
          longest_streak_start: null,
          longest_streak_end: null,
          current_streak: 0,
          current_streak_start: null,
          current_streak_end: null,
        }),
      }
    }

    return {
      success: true,
      data: transformListeningStreak(row),
    }
  } catch (error) {
    return {
      success: false,
      error: new AnalyticsError(
        "Unexpected error fetching listening streaks",
        undefined,
        error
      ),
    }
  }
}

/**
 * Fetch paginated listening history with search and date filtering
 */
export async function getListeningHistory(
  supabase: SupabaseClient,
  params: ListeningHistoryParams = {}
): Promise<
  AnalyticsResult<{
    data: ListeningHistoryDatum[]
    totalCount: number
  }>
> {
  if (!hasRpc(supabase)) {
    return getListeningHistoryFallback(supabase, params)
  }
  try {
    console.log('[Analytics] Fetching listening history with params:', {
      search_query: params.search_query ?? null,
      start_date: params.start_date ?? null,
      end_date: params.end_date ?? null,
      limit_count: params.limit_count ?? 50,
      offset_count: params.offset_count ?? 0,
    })

    const { data, error } = await supabase.rpc("get_listening_history", {
      search_query: params.search_query ?? null,
      start_date: params.start_date ?? null,
      end_date: params.end_date ?? null,
      limit_count: params.limit_count ?? 50,
      offset_count: params.offset_count ?? 0,
    })

    if (error) {
      console.error('[Analytics] Error fetching listening history:', error)

      // Provide more specific error messages
      let errorMessage = "Failed to fetch listening history"
      if (error.code === 'AUTH1' || error.message?.includes('Authentication required')) {
        errorMessage = "Please log in to view your listening history"
      } else if (error.code === 'PGRST116') {
        errorMessage = "Database function not found. Please contact support."
      }

      return {
        success: false,
        error: new AnalyticsError(errorMessage, error.code, error),
      }
    }

    const rows = (data as ListeningHistoryResponse[]) ?? []
    const totalCount = rows.length > 0 ? rows[0].total_count : 0

    console.log('[Analytics] Listening history fetched successfully:', {
      rowCount: rows.length,
      totalCount,
    })

    return {
      success: true,
      data: {
        data: rows.map(transformListeningHistory),
        totalCount,
      },
    }
  } catch (error) {
    console.error('[Analytics] Unexpected error fetching listening history:', error)
    return {
      success: false,
      error: new AnalyticsError(
        "Unexpected error fetching listening history",
        undefined,
        error
      ),
    }
  }
}

/**
 * Fetch available timeframes (years and months with data)
 */
export async function getAvailableTimeframes(
  supabase: SupabaseClient
): Promise<AnalyticsResult<TimeframeData[]>> {
  if (!hasRpc(supabase)) {
    return getAvailableTimeframesFallback(supabase)
  }
  try {
    const { data, error } = await supabase.rpc("get_available_timeframes")

    if (error) {
      return {
        success: false,
        error: new AnalyticsError(
          "Failed to fetch available timeframes",
          error.code,
          error
        ),
      }
    }

    const rows = (data as TimeframeResponse[]) ?? []
    return {
      success: true,
      data: rows.map(transformTimeframe),
    }
  } catch (error) {
    return {
      success: false,
      error: new AnalyticsError(
        "Unexpected error fetching available timeframes",
        undefined,
        error
      ),
    }
  }
}

/**
 * Refresh all analytics materialized views
 * Call this after bulk data imports to update pre-aggregated data
 */
export async function refreshAnalyticsViews(
  supabase: SupabaseClient
): Promise<AnalyticsResult<void>> {
  if (!hasRpc(supabase)) {
    return { success: true, data: undefined }
  }
  try {
    const { error } = await supabase.rpc("refresh_analytics_views")

    if (error) {
      return {
        success: false,
        error: new AnalyticsError(
          "Failed to refresh analytics views",
          error.code,
          error
        ),
      }
    }

    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error: new AnalyticsError(
        "Unexpected error refreshing analytics views",
        undefined,
        error
      ),
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Fetch all dashboard data for a given timeframe
 */
export async function getDashboardData(
  supabase: SupabaseClient,
  timeframe: TimeframeFilter
) {
  const params = timeframeToParams(timeframe)

  const [
    summaryResult,
    artistsResult,
    tracksResult,
    trendsResult,
    weeklyTrendsResult,
    streakResult,
    clockResult,
    discoveryResult,
    loyaltyResult,
  ] = await Promise.all([
    getDashboardSummary(supabase, params),
    getTopArtists(supabase, { ...params, limit_count: 5 }),
    getTopTracks(supabase, { ...params, limit_count: 5 }),
    getListeningTrends(supabase, params),
    getWeeklyListeningTrends(supabase, params),
    getListeningStreaks(supabase, params),
    getListeningClock(supabase, params),
    getDiscoveryTracker(supabase, params),
    getLoyaltyGauge(supabase, params),
  ])

  // Check for errors
  if (!summaryResult.success) {
    return { success: false as const, error: summaryResult.error }
  }
  if (!artistsResult.success) {
    return { success: false as const, error: artistsResult.error }
  }
  if (!tracksResult.success) {
    return { success: false as const, error: tracksResult.error }
  }
  if (!trendsResult.success) {
    return { success: false as const, error: trendsResult.error }
  }
  if (!weeklyTrendsResult.success) {
    return { success: false as const, error: weeklyTrendsResult.error }
  }
  if (!streakResult.success) {
    return { success: false as const, error: streakResult.error }
  }
  if (!clockResult.success) {
    return { success: false as const, error: clockResult.error }
  }
  if (!discoveryResult.success) {
    return { success: false as const, error: discoveryResult.error }
  }
  if (!loyaltyResult.success) {
    return { success: false as const, error: loyaltyResult.error }
  }

  return {
    success: true as const,
    data: {
      summary: summaryResult.data,
      topArtists: artistsResult.data,
      topTracks: tracksResult.data,
      listeningTrends: trendsResult.data,
      weeklyListeningTrends: weeklyTrendsResult.data,
      listeningStreak: streakResult.data,
      listeningClock: clockResult.data,
      discoveryTracker: discoveryResult.data,
      loyaltyGauge: loyaltyResult.data,
    },
  }
}

// ============================================================================
// Fallback Aggregations (used when Supabase RPC is unavailable)
// ============================================================================

const roundHours = (value: number) => Number(value.toFixed(1))

const hoursFromMs = (ms: number) => ms / MS_PER_HOUR

const normalizeTimeWindow = (params: TimeWindowParams = {}) => {
  const start = params.start_date ? new Date(params.start_date) : null
  const end = params.end_date ? new Date(params.end_date) : null
  return {
    start: start && !Number.isNaN(start.getTime()) ? start : null,
    end: end && !Number.isNaN(end.getTime()) ? end : null,
  }
}

let listenCache = new WeakMap<
  SupabaseClient,
  Map<string, Promise<AnalyticsResult<ValidListen[]>>>
>()

let historyCache = new WeakMap<
  SupabaseClient,
  Promise<AnalyticsResult<ListenRow[]>>
>()

const filterListensByWindow = (
  listens: ValidListen[],
  params: TimeWindowParams = {}
) => {
  const { start, end } = normalizeTimeWindow(params)
  return listens.filter((listen) => {
    if (start && listen.ts < start) {
      return false
    }
    if (end && listen.ts >= end) {
      return false
    }
    return true
  })
}

const fetchValidListens = async (
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<ValidListen[]>> => {
  const fromFn = (supabase as { from?: SupabaseClient["from"] }).from

  if (typeof fromFn !== "function") {
    return {
      success: false,
      error: new AnalyticsError(
        "Supabase client does not support querying listens"
      ),
    }
  }

  const cacheKey = "all"
  let cache = listenCache.get(supabase)
  if (!cache) {
    cache = new Map()
    listenCache.set(supabase, cache)
  }

  const cached = cache.get(cacheKey)
  if (cached) {
    return cached
  }

  const promise = (async (): Promise<AnalyticsResult<ValidListen[]>> => {
  try {
    const { data, error } = await fromFn.call(supabase, "listens").select(
      "artist, track, ts, ms_played"
    )

    if (error) {
      return {
        success: false,
        error: new AnalyticsError("Failed to fetch listens", error.code, error),
      }
    }

    const rows = (data as ListenRow[] | null) ?? []

    const listens: ValidListen[] = []
    for (const row of rows) {
      if (!row.ts || typeof row.ms_played !== "number") {
        continue
      }
      const ts = new Date(row.ts)
      if (Number.isNaN(ts.getTime())) {
        continue
      }
      listens.push({
        ts,
        ms: row.ms_played,
        artist: row.artist,
        track: row.track,
      })
    }

    return { success: true, data: listens }
  } catch (error) {
    return {
      success: false,
      error: new AnalyticsError(
        "Unexpected error fetching listens",
        undefined,
        error
      ),
    }
  }
  })()

  cache.set(cacheKey, promise)
  const result = await promise
  if (!result.success) {
    cache.delete(cacheKey)
  }
  return result
}

const computeSummaryFromListens = (listens: ValidListen[]): DashboardStats => {
  const totalHours = listens.reduce((sum, listen) => sum + hoursFromMs(listen.ms), 0)
  const artists = new Set(
    listens.map((listen) => listen.artist).filter((value): value is string => Boolean(value))
  )
  const tracks = new Set(
    listens.map((listen) => listen.track).filter((value): value is string => Boolean(value))
  )

  const artistTotals = new Map<string, number>()
  const yearTotals = new Map<number, number>()

  for (const listen of listens) {
    if (listen.artist) {
      const current = artistTotals.get(listen.artist) ?? 0
      artistTotals.set(listen.artist, current + hoursFromMs(listen.ms))
    }
    const year = listen.ts.getUTCFullYear()
    const yearHours = yearTotals.get(year) ?? 0
    yearTotals.set(year, yearHours + hoursFromMs(listen.ms))
  }

  let topArtist: string | null = null
  let topHours = 0
  for (const [artist, hours] of artistTotals.entries()) {
    if (hours > topHours) {
      topArtist = artist
      topHours = hours
    }
  }

  let mostActiveYear: string | null = null
  let mostActiveHours = 0
  for (const [year, hours] of yearTotals.entries()) {
    if (hours > mostActiveHours) {
      mostActiveYear = year.toString()
      mostActiveHours = hours
    }
  }

  return {
    totalHours: totalHours.toFixed(1),
    artists: artists.size,
    tracks: tracks.size,
    topArtist,
    mostActiveYear,
  }
}

const getDashboardSummaryFallback = async (
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<DashboardStats>> => {
  const listensResult = await fetchValidListens(supabase, params)
  if (!listensResult.success) {
    return listensResult
  }

  return {
    success: true,
    data: computeSummaryFromListens(
      filterListensByWindow(listensResult.data, params)
    ),
  }
}

const limitAndOffset = <T,>(
  data: T[],
  params: PaginationParams = {}
): T[] => {
  const offset = params.offset_count ?? 0
  const limit = params.limit_count ?? data.length
  return data.slice(offset, offset + limit)
}

const getTopArtistsFallback = async (
  supabase: SupabaseClient,
  params: TopArtistsParams = {}
): Promise<AnalyticsResult<TopArtistDatum[]>> => {
  const listensResult = await fetchValidListens(supabase, params)
  if (!listensResult.success) {
    return listensResult
  }

  const filtered = filterListensByWindow(listensResult.data, params)
  const totals = new Map<string, number>()
  for (const listen of filtered) {
    if (!listen.artist) continue
    const current = totals.get(listen.artist) ?? 0
    totals.set(listen.artist, current + hoursFromMs(listen.ms))
  }

  const sorted = Array.from(totals.entries())
    .map(([name, hours]) => ({ name, hours: roundHours(hours) }))
    .sort((a, b) => b.hours - a.hours)

  return { success: true, data: limitAndOffset(sorted, params) }
}

const getTopTracksFallback = async (
  supabase: SupabaseClient,
  params: TopTracksParams = {}
): Promise<AnalyticsResult<TopTrackDatum[]>> => {
  const listensResult = await fetchValidListens(supabase, params)
  if (!listensResult.success) {
    return listensResult
  }

  const filtered = filterListensByWindow(listensResult.data, params)
  const totals = new Map<
    string,
    { hours: number; artist: string | null }
  >()

  for (const listen of filtered) {
    if (!listen.track) continue
    const current = totals.get(listen.track) ?? { hours: 0, artist: null }
    current.hours += hoursFromMs(listen.ms)
    if (!current.artist && listen.artist) {
      current.artist = listen.artist
    }
    totals.set(listen.track, current)
  }

  const sorted = Array.from(totals.entries())
    .map(([track, { hours, artist }]) => ({
      track,
      artist,
      hours: roundHours(hours),
    }))
    .sort((a, b) => b.hours - a.hours)

  return { success: true, data: limitAndOffset(sorted, params) }
}

const getListeningTrendsFallback = async (
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<ListeningTrendDatum[]>> => {
  const listensResult = await fetchValidListens(supabase, params)
  if (!listensResult.success) {
    return listensResult
  }

  const filtered = filterListensByWindow(listensResult.data, params)
  const totals = new Map<string, { month: Date; hours: number; count: number }>()
  for (const listen of filtered) {
    const year = listen.ts.getUTCFullYear()
    const month = listen.ts.getUTCMonth()
    const monthStart = new Date(Date.UTC(year, month, 1))
    const key = monthStart.toISOString()
    const entry = totals.get(key) ?? { month: monthStart, hours: 0, count: 0 }
    entry.hours += hoursFromMs(listen.ms)
    entry.count += 1
    totals.set(key, entry)
  }

  const rows: ListeningTrendDatum[] = Array.from(totals.values())
    .sort((a, b) => a.month.getTime() - b.month.getTime())
    .map((entry) =>
      transformListeningTrend({
        month: entry.month.toISOString(),
        total_hours: roundHours(entry.hours).toString(),
        listen_count: entry.count,
      })
    )

  return { success: true, data: rows }
}

const startOfIsoWeek = (date: Date) => {
  const day = date.getUTCDay()
  const diff = (day + 6) % 7
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  start.setUTCDate(start.getUTCDate() - diff)
  return start
}

const isoWeekInfo = (date: Date) => {
  const temp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = (temp.getUTCDay() + 6) % 7
  temp.setUTCDate(temp.getUTCDate() - day + 3)
  const firstThursday = new Date(Date.UTC(temp.getUTCFullYear(), 0, 4))
  const diff = temp.getTime() - firstThursday.getTime()
  const week = 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000))
  const year = temp.getUTCFullYear()
  return { week, year }
}

const getWeeklyListeningTrendsFallback = async (
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<WeeklyListeningTrendDatum[]>> => {
  const listensResult = await fetchValidListens(supabase, params)
  if (!listensResult.success) {
    return listensResult
  }

  const filtered = filterListensByWindow(listensResult.data, params)
  const totals = new Map<
    string,
    {
      weekStart: Date
      weekEnd: Date
      week: number
      year: number
      hours: number
      count: number
    }
  >()

  for (const listen of filtered) {
    const weekStart = startOfIsoWeek(listen.ts)
    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
    const { week, year } = isoWeekInfo(listen.ts)
    const key = `${year}-W${week}`
    const entry =
      totals.get(key) ?? {
        weekStart,
        weekEnd,
        week,
        year,
        hours: 0,
        count: 0,
      }
    entry.hours += hoursFromMs(listen.ms)
    entry.count += 1
    totals.set(key, entry)
  }

  const rows: WeeklyListeningTrendDatum[] = Array.from(totals.values())
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
    .map((entry) =>
      transformWeeklyListeningTrend({
        week_start: entry.weekStart.toISOString(),
        week_end: entry.weekEnd.toISOString(),
        week_number: entry.week,
        year: entry.year,
        total_hours: roundHours(entry.hours).toString(),
        listen_count: entry.count,
      })
    )

  return { success: true, data: rows }
}

const getListeningClockFallback = async (
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<ListeningClockDatum[]>> => {
  const listensResult = await fetchValidListens(supabase, params)
  if (!listensResult.success) {
    return listensResult
  }

  const filtered = filterListensByWindow(listensResult.data, params)
  const totals = new Map<string, { day: number; hour: number; hours: number; count: number }>()
  for (const listen of filtered) {
    const day = listen.ts.getUTCDay()
    const hour = listen.ts.getUTCHours()
    const key = `${day}-${hour}`
    const entry = totals.get(key) ?? { day, hour, hours: 0, count: 0 }
    entry.hours += hoursFromMs(listen.ms)
    entry.count += 1
    totals.set(key, entry)
  }

  const rows = Array.from(totals.values())
    .sort((a, b) => a.day - b.day || a.hour - b.hour)
    .map((entry) =>
      transformListeningClock({
        day_of_week: entry.day,
        hour_of_day: entry.hour,
        total_hours: roundHours(entry.hours).toString(),
        listen_count: entry.count,
      })
    )

  return { success: true, data: rows }
}

const getListeningStreaksFallback = async (
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<ReturnType<typeof transformListeningStreak>>> => {
  const listensResult = await fetchValidListens(supabase, params)
  if (!listensResult.success) {
    return listensResult
  }

  const filtered = filterListensByWindow(listensResult.data, params)
  const uniqueDays = Array.from(
    new Set(
      filtered.map((listen) =>
        new Date(
          Date.UTC(
            listen.ts.getUTCFullYear(),
            listen.ts.getUTCMonth(),
            listen.ts.getUTCDate()
          )
        ).toISOString()
      )
    )
  )
    .map((iso) => new Date(iso))
    .sort((a, b) => a.getTime() - b.getTime())

  if (uniqueDays.length === 0) {
    return {
      success: true,
      data: transformListeningStreak({
        longest_streak: 0,
        longest_streak_start: null,
        longest_streak_end: null,
        current_streak: 0,
        current_streak_start: null,
        current_streak_end: null,
      }),
    }
  }

  let longestLength = 1
  let longestStart = uniqueDays[0]
  let longestEnd = uniqueDays[0]

  let currentLength = 1
  let currentStart = uniqueDays[0]
  let currentEnd = uniqueDays[0]

  for (let i = 1; i < uniqueDays.length; i += 1) {
    const prev = uniqueDays[i - 1]
    const current = uniqueDays[i]
    const diffDays = Math.round(
      (current.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
    )

    if (diffDays === 1) {
      currentLength += 1
      currentEnd = current
    } else {
      currentLength = 1
      currentStart = current
      currentEnd = current
    }

    if (
      currentLength > longestLength ||
      (currentLength === longestLength && currentEnd > longestEnd)
    ) {
      longestLength = currentLength
      longestStart = currentStart
      longestEnd = currentEnd
    }
  }

  const lastDay = uniqueDays[uniqueDays.length - 1]
  let trailingLength = 1
  let trailingStart = lastDay
  for (let i = uniqueDays.length - 2; i >= 0; i -= 1) {
    const current = uniqueDays[i]
    const diffDays = Math.round(
      (lastDay.getTime() - current.getTime()) / (24 * 60 * 60 * 1000)
    )
    if (diffDays === trailingLength) {
      trailingLength += 1
      trailingStart = current
    } else {
      break
    }
  }

  return {
    success: true,
    data: transformListeningStreak({
      longest_streak: longestLength,
      longest_streak_start: longestStart.toISOString(),
      longest_streak_end: longestEnd.toISOString(),
      current_streak: trailingLength,
      current_streak_start: trailingStart.toISOString(),
      current_streak_end: lastDay.toISOString(),
    }),
  }
}

const monthKeyFromDate = (date: Date) => {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const key = `${year}-${String(month).padStart(2, "0")}`
  return { key, year, month }
}

const includeInWindow = (date: Date, params: TimeWindowParams = {}) => {
  const { start, end } = normalizeTimeWindow(params)
  if (start && date < start) {
    return false
  }
  if (end && date >= end) {
    return false
  }
  return true
}

const getDiscoveryTrackerFallback = async (
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<DiscoveryTrackerDatum[]>> => {
  const listensResult = await fetchValidListens(supabase, params)
  if (!listensResult.success) {
    return listensResult
  }

  const listens = [...listensResult.data].sort(
    (a, b) => a.ts.getTime() - b.ts.getTime()
  )

  const firstTracks = new Map<string, Date>()
  const firstArtists = new Map<string, Date>()

  for (const listen of listens) {
    if (listen.track && !firstTracks.has(listen.track)) {
      firstTracks.set(listen.track, listen.ts)
    }
    if (listen.artist && !firstArtists.has(listen.artist)) {
      firstArtists.set(listen.artist, listen.ts)
    }
  }

  const monthTotals = new Map<
    string,
    { year: number; month: number; newArtists: number; newTracks: number }
  >()

  for (const [, firstDate] of firstTracks.entries()) {
    if (!includeInWindow(firstDate, params)) {
      continue
    }
    const { key, year, month } = monthKeyFromDate(firstDate)
    const entry =
      monthTotals.get(key) ?? { year, month, newArtists: 0, newTracks: 0 }
    entry.newTracks += 1
    monthTotals.set(key, entry)
  }

  for (const [, firstDate] of firstArtists.entries()) {
    if (!includeInWindow(firstDate, params)) {
      continue
    }
    const { key, year, month } = monthKeyFromDate(firstDate)
    const entry =
      monthTotals.get(key) ?? { year, month, newArtists: 0, newTracks: 0 }
    entry.newArtists += 1
    monthTotals.set(key, entry)
  }

  const data: DiscoveryTrackerDatum[] = Array.from(monthTotals.values())
    .sort((a, b) => {
      const aDate = Date.UTC(a.year, a.month - 1, 1)
      const bDate = Date.UTC(b.year, b.month - 1, 1)
      return aDate - bDate
    })
    .map((entry) => ({
      month: `${entry.year}-${String(entry.month).padStart(2, "0")}`,
      label: formatMonthLabel(entry.year, entry.month),
      newArtists: entry.newArtists,
      newTracks: entry.newTracks,
    }))

  return { success: true, data }
}

const REPEAT_TRACK_THRESHOLD = 5

const getLoyaltyGaugeFallback = async (
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<LoyaltyGaugeData>> => {
  const listensResult = await fetchValidListens(supabase, params)
  if (!listensResult.success) {
    return listensResult
  }

  const filtered = filterListensByWindow(listensResult.data, params)
  if (!filtered.length) {
    return {
      success: true,
      data: {
        threshold: REPEAT_TRACK_THRESHOLD,
        monthly: [],
        topRepeatTracks: [],
      },
    }
  }

  const trackTotals = new Map<
    string,
    { count: number; artist: string | null }
  >()

  for (const listen of filtered) {
    if (!listen.track) {
      continue
    }

    const entry = trackTotals.get(listen.track) ?? {
      count: 0,
      artist: listen.artist ?? null,
    }

    entry.count += 1
    if (!entry.artist && listen.artist) {
      entry.artist = listen.artist
    }
    trackTotals.set(listen.track, entry)
  }

  const repeatTracks = new Set(
    Array.from(trackTotals.entries())
      .filter(([, info]) => info.count >= REPEAT_TRACK_THRESHOLD)
      .map(([track]) => track)
  )

  const monthTotals = new Map<
    string,
    {
      year: number
      month: number
      totalListens: number
      repeatListens: number
    }
  >()

  for (const listen of filtered) {
    if (!listen.track) {
      continue
    }

    const { key, year, month } = monthKeyFromDate(listen.ts)
    const entry =
      monthTotals.get(key) ?? {
        year,
        month,
        totalListens: 0,
        repeatListens: 0,
      }

    entry.totalListens += 1
    if (repeatTracks.has(listen.track)) {
      entry.repeatListens += 1
    }

    monthTotals.set(key, entry)
  }

  const monthly: LoyaltyTrendDatum[] = Array.from(monthTotals.values())
    .sort((a, b) => {
      const aDate = Date.UTC(a.year, a.month - 1, 1)
      const bDate = Date.UTC(b.year, b.month - 1, 1)
      return aDate - bDate
    })
    .map((entry) => ({
      month: `${entry.year}-${String(entry.month).padStart(2, "0")}`,
      label: formatMonthLabel(entry.year, entry.month),
      repeatListenShare:
        entry.totalListens > 0 ? entry.repeatListens / entry.totalListens : 0,
      repeatListenCount: entry.repeatListens,
      totalListenCount: entry.totalListens,
    }))

  const topRepeatTracks: TopRepeatTrackDatum[] = Array.from(
    trackTotals.entries()
  )
    .filter(([, info]) => info.count >= REPEAT_TRACK_THRESHOLD)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([track, info]) => ({
      track,
      artist: info.artist,
      playCount: info.count,
    }))

  return {
    success: true,
    data: {
      threshold: REPEAT_TRACK_THRESHOLD,
      monthly,
      topRepeatTracks,
    },
  }
}

const getAvailableTimeframesFallback = async (
  supabase: SupabaseClient
): Promise<AnalyticsResult<TimeframeData[]>> => {
  const listensResult = await fetchValidListens(supabase, {})
  if (!listensResult.success) {
    return listensResult
  }

  const totals = new Map<
    string,
    { year: number; month: number; listenCount: number; hours: number }
  >()
  for (const listen of listensResult.data) {
    const year = listen.ts.getUTCFullYear()
    const month = listen.ts.getUTCMonth() + 1
    const key = `${year}-${month}`
    const entry = totals.get(key) ?? {
      year,
      month,
      listenCount: 0,
      hours: 0,
    }
    entry.listenCount += 1
    entry.hours += hoursFromMs(listen.ms)
    totals.set(key, entry)
  }

  const rows = Array.from(totals.values())
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((entry) =>
      transformTimeframe({
        year: entry.year,
        month: entry.month,
        listen_count: entry.listenCount,
        total_hours: roundHours(entry.hours).toString(),
      })
    )

  return { success: true, data: rows }
}

const fetchHistoryRows = async (
  supabase: SupabaseClient
): Promise<AnalyticsResult<ListenRow[]>> => {
  const fromFn = (supabase as { from?: SupabaseClient["from"] }).from

  if (typeof fromFn !== "function") {
    return {
      success: false,
      error: new AnalyticsError(
        "Supabase client does not support querying listens"
      ),
    }
  }

  const cached = historyCache.get(supabase)
  if (cached) {
    return cached
  }

  const promise = (async (): Promise<AnalyticsResult<ListenRow[]>> => {
    try {
      const { data, error } = await fromFn.call(supabase, "listens").select(
        "artist, track, ts, ms_played"
      )

      if (error) {
        return {
          success: false,
          error: new AnalyticsError(
            "Failed to fetch listens",
            error.code,
            error
          ),
        }
      }

      const rows = (data as ListenRow[] | null) ?? []
      return { success: true, data: rows }
    } catch (error) {
      return {
        success: false,
        error: new AnalyticsError(
          "Unexpected error fetching listens",
          undefined,
          error
        ),
      }
    }
  })()

  historyCache.set(supabase, promise)
  const result = await promise
  if (!result.success) {
    historyCache.delete(supabase)
  }
  return result
}

const getListeningHistoryFallback = async (
  supabase: SupabaseClient,
  params: ListeningHistoryParams = {}
): Promise<
  AnalyticsResult<{
    data: ListeningHistoryDatum[]
    totalCount: number
  }>
> => {
  const rowsResult = await fetchHistoryRows(supabase)
  if (!rowsResult.success) {
    return rowsResult
  }

  const { start, end } = normalizeTimeWindow(params)
  const query = params.search_query ? params.search_query.toLowerCase() : null

  const filtered = rowsResult.data.filter((row) => {
    if (!row.ts) return false
    const tsDate = new Date(row.ts)
    if (Number.isNaN(tsDate.getTime())) {
      return false
    }
    if (start && tsDate < start) {
      return false
    }
    if (end && tsDate >= end) {
      return false
    }
    if (!query) {
      return true
    }
    const track = row.track?.toLowerCase() ?? ""
    const artist = row.artist?.toLowerCase() ?? ""
    return track.includes(query) || artist.includes(query)
  })

  const totalCount = filtered.length
  const offset = params.offset_count ?? 0
  const limit = params.limit_count ?? 50
  const paginated = filtered.slice(offset, offset + limit)

  const data = paginated.map((row) =>
    transformListeningHistory({
      track: row.track,
      artist: row.artist,
      ts: row.ts!,
      ms_played: row.ms_played,
      total_count: totalCount,
    })
  )

  return {
    success: true,
    data: {
      data,
      totalCount,
    },
  }
}

export const __analyticsFallback = {
  resetCaches: () => {
    listenCache = new WeakMap()
    historyCache = new WeakMap()
  },
}
