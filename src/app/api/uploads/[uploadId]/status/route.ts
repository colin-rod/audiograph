import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

type RouteContext = {
  params: Promise<{
    uploadId: string
  }>
}

/**
 * GET /api/uploads/:uploadId/status
 * Returns the status and progress of an upload job
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get upload ID from params
    const { uploadId } = await context.params

    // Fetch upload job
    const { data: uploadJob, error: jobError } = await supabase
      .from('upload_jobs')
      .select('*')
      .eq('id', uploadId)
      .single()

    if (jobError) {
      if (jobError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Upload job not found' },
          { status: 404 }
        )
      }

      console.error('[API] Error fetching upload job:', jobError)
      return NextResponse.json(
        { error: 'Failed to fetch upload job status' },
        { status: 500 }
      )
    }

    // Check if job belongs to the user (RLS should handle this, but double-check)
    if (uploadJob.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Return job status
    return NextResponse.json({
      id: uploadJob.id,
      status: uploadJob.status,
      filename: uploadJob.filename,
      totalFiles: uploadJob.total_files,
      processedFiles: uploadJob.processed_files,
      totalRecords: uploadJob.total_records,
      errorMessage: uploadJob.error_message,
      createdAt: uploadJob.created_at,
      updatedAt: uploadJob.updated_at,
    })
  } catch (error) {
    console.error('[API] Error getting upload status:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
