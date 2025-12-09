import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * POST /api/uploads/json/create
 * Creates an upload job and returns the job ID for client-side file uploads
 */
export async function POST(request: NextRequest) {
  console.log('[API] Create upload job request received')
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies })
    console.log('[API] Getting authenticated user...')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[API] Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[API] User authenticated:', user.id)

    // Parse request body
    const { fileCount, filename } = await request.json()

    if (!fileCount || fileCount <= 0) {
      return NextResponse.json(
        { error: 'Invalid file count' },
        { status: 400 }
      )
    }

    // Create upload job record
    const { data: uploadJob, error: jobError } = await supabase
      .from('upload_jobs')
      .insert({
        user_id: user.id,
        filename: filename || `${fileCount} JSON files`,
        total_files: fileCount,
        processed_files: 0,
        total_records: 0,
        status: 'pending',
      })
      .select()
      .single()

    if (jobError || !uploadJob) {
      console.error('[API] Failed to create upload job:', jobError)
      return NextResponse.json(
        { error: 'Failed to create upload job' },
        { status: 500 }
      )
    }

    console.log(`[API] Created upload job: ${uploadJob.id}`)

    return NextResponse.json({
      uploadJobId: uploadJob.id,
      userId: user.id,
      message: 'Upload job created successfully',
    })
  } catch (error) {
    console.error('[API] Error creating upload job:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
