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
  ListeningTrendDatum,
  ListeningTrendResponse,
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
} from "./analytics-types"
import {
  transformDashboardSummary,
  transformListeningClock,
  transformListeningHistory,
  transformListeningTrend,
  transformTimeframe,
  transformTopArtist,
  transformTopTrack,
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
  }
}

type AnalyticsResult<T> =
  | { success: true; data: T }
  | { success: false; error: AnalyticsError }

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
 * Fetch listening clock heatmap data
 */
export async function getListeningClock(
  supabase: SupabaseClient,
  params: TimeWindowParams = {}
): Promise<AnalyticsResult<ListeningClockDatum[]>> {
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

  const [summaryResult, artistsResult, tracksResult, trendsResult, clockResult] =
    await Promise.all([
      getDashboardSummary(supabase, params),
      getTopArtists(supabase, { ...params, limit_count: 5 }),
      getTopTracks(supabase, { ...params, limit_count: 5 }),
      getListeningTrends(supabase, params),
      getListeningClock(supabase, params),
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
  if (!clockResult.success) {
    return { success: false as const, error: clockResult.error }
  }

  return {
    success: true as const,
    data: {
      summary: summaryResult.data,
      topArtists: artistsResult.data,
      topTracks: tracksResult.data,
      listeningTrends: trendsResult.data,
      listeningClock: clockResult.data,
    },
  }
}
