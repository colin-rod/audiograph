import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * POST /api/uploads/json/queue
 * Queues processing jobs for files already uploaded to Storage
 */
export async function POST(request: NextRequest) {
  console.log('[API] Queue processing jobs request received')
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
    const { uploadJobId, files, totalFiles } = await request.json()

    if (!uploadJobId || !files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: missing uploadJobId or files' },
        { status: 400 }
      )
    }

    // Verify upload job exists and belongs to user
    const { data: uploadJob, error: jobError } = await supabase
      .from('upload_jobs')
      .select('id, user_id')
      .eq('id', uploadJobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !uploadJob) {
      console.error('[API] Upload job not found or unauthorized:', jobError)
      return NextResponse.json(
        { error: 'Upload job not found or unauthorized' },
        { status: 404 }
      )
    }

    // Create file processing jobs
    console.log('[API] Creating file processing jobs...')
    const fileJobs = files.map((file: { filename: string; filePath: string; fileIndex: number }) => ({
      upload_job_id: uploadJobId,
      user_id: user.id,
      filename: file.filename,
      file_path: file.filePath,
      file_index: file.fileIndex,
      total_files: totalFiles,
      status: 'pending' as const
    }))

    const { error: insertError } = await supabase
      .from('file_processing_jobs')
      .insert(fileJobs)

    if (insertError) {
      console.error('[API] Failed to create file processing jobs:', insertError)
      // Update upload job status to failed
      await supabase
        .from('upload_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to queue files for processing'
        })
        .eq('id', uploadJobId)

      return NextResponse.json(
        { error: 'Failed to queue files for processing' },
        { status: 500 }
      )
    }

    console.log(`[API] Created ${fileJobs.length} file processing jobs`)

    // Update job status to processing
    await supabase
      .from('upload_jobs')
      .update({ status: 'processing' })
      .eq('id', uploadJobId)

    // Trigger Supabase Edge Function to process jobs asynchronously
    // Don't await - let it run in background
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-files`
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (edgeFunctionUrl && serviceRoleKey) {
      console.log('[API] Triggering Edge Function to process jobs...')
      fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }).catch(error => {
        console.error('[API] Failed to trigger Edge Function:', error)
        // Don't fail the request - jobs are in DB and can be processed later
      })
    } else {
      console.warn('[API] Edge Function URL or service key not configured, jobs will need manual processing')
    }

    return NextResponse.json({
      message: `Successfully queued ${fileJobs.length} file${fileJobs.length === 1 ? '' : 's'} for processing`,
      totalFiles: fileJobs.length,
    })
  } catch (error) {
    console.error('[API] Error queuing processing jobs:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
