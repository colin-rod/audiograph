import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Patterns to identify Spotify JSON files
 */
const SPOTIFY_FILE_PATTERNS = [
  /Streaming_History_Audio.*\.json$/i,
  /StreamingHistory.*\.json$/i,
  /endsong.*\.json$/i
]

/**
 * Maximum file size (10MB per file)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Check if filename matches Spotify patterns
 */
function isSpotifyFile(filename: string): boolean {
  return SPOTIFY_FILE_PATTERNS.some(pattern => pattern.test(filename))
}

/**
 * POST /api/uploads/json
 * Accepts single or multiple JSON file uploads and queues processing jobs
 */
export async function POST(request: NextRequest) {
  console.log('[API] JSON upload request received')
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

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files')

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Validate and collect JSON files
    const validFiles: { file: File; content: string }[] = []
    const errors: string[] = []

    for (const fileEntry of files) {
      if (!(fileEntry instanceof File)) {
        errors.push('Invalid file entry')
        continue
      }

      const file = fileEntry

      // Validate file extension
      if (!file.name.toLowerCase().endsWith('.json')) {
        errors.push(`${file.name}: Not a JSON file`)
        continue
      }

      // Validate file name matches Spotify patterns
      if (!isSpotifyFile(file.name)) {
        errors.push(`${file.name}: Not a recognized Spotify file format`)
        continue
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(
          `${file.name}: File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB, max 10MB)`
        )
        continue
      }

      if (file.size === 0) {
        errors.push(`${file.name}: File is empty`)
        continue
      }

      // Read and validate JSON content
      try {
        const content = await file.text()

        // Validate it's valid JSON
        JSON.parse(content)

        validFiles.push({ file, content })
      } catch (parseError) {
        errors.push(`${file.name}: Invalid JSON format`)
        continue
      }
    }

    // If no valid files, return error
    if (validFiles.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid Spotify JSON files found',
          details: errors
        },
        { status: 400 }
      )
    }

    console.log(`[API] Processing ${validFiles.length} valid JSON files`)
    if (errors.length > 0) {
      console.log(`[API] Skipped ${errors.length} invalid files:`, errors)
    }

    // Create upload job record
    const { data: uploadJob, error: jobError } = await supabase
      .from('upload_jobs')
      .insert({
        user_id: user.id,
        filename: validFiles.length === 1
          ? validFiles[0].file.name
          : `${validFiles.length} JSON files`,
        total_files: validFiles.length,
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

    // Create file processing jobs (using database polling instead of pg-boss)
    console.log('[API] Creating file processing jobs...')
    const fileJobs = validFiles.map((sf, i) => ({
      upload_job_id: uploadJob.id,
      user_id: user.id,
      filename: sf.file.name,
      file_content: sf.content,
      file_index: i,
      total_files: validFiles.length,
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
        .eq('id', uploadJob.id)

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
      .eq('id', uploadJob.id)

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
      uploadJobId: uploadJob.id,
      totalFiles: validFiles.length,
      skippedFiles: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully queued ${validFiles.length} file${validFiles.length === 1 ? '' : 's'} for processing`,
    })
  } catch (error) {
    console.error('[API] Error handling JSON upload:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
