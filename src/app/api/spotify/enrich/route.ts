/**
 * Spotify Enrichment API Route
 *
 * Triggers background enrichment of listening data with Spotify metadata
 */

import { NextRequest, NextResponse } from 'next/server'
import { enrichListens, getEnrichmentProgress } from '@/lib/spotify/enrichment'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max execution time

/**
 * GET /api/spotify/enrich
 * Get enrichment progress
 */
export async function GET() {
  try {
    const progress = await getEnrichmentProgress()
    return NextResponse.json(progress)
  } catch (error) {
    console.error('Error getting enrichment progress:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get enrichment progress',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/spotify/enrich
 * Start enrichment process
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const limit = body.limit || 100

    // Validate limit
    if (limit < 1 || limit > 500) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 500' },
        { status: 400 }
      )
    }

    // Start enrichment
    const stats = await enrichListens(limit)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Error during enrichment:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Enrichment failed',
      },
      { status: 500 }
    )
  }
}
