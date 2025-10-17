import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { extractJsonFromZip } from '@/lib/upload/zip-extractor'
import { QueueClient } from '@/lib/queue/client'
import type { ProcessJsonFileJobData } from '@/lib/queue/processor'

const PROCESS_JSON_QUEUE = 'process-json-file'

/**
 * POST /api/uploads/zip
 * Accepts ZIP file upload, extracts JSON files, and queues processing jobs
 */
export async function POST(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Only ZIP files are supported' },
        { status: 400 }
      )
    }

    // Extract JSON files from ZIP
    console.log(`[API] Extracting ZIP file: ${file.name}`)
    const extractResult = await extractJsonFromZip(file)

    if (!extractResult.success) {
      return NextResponse.json(
        { error: extractResult.error },
        { status: 400 }
      )
    }

    const { files } = extractResult
    console.log(`[API] Extracted ${files.length} JSON files from ${file.name}`)

    // Create upload job record
    const { data: uploadJob, error: jobError } = await supabase
      .from('upload_jobs')
      .insert({
        user_id: user.id,
        filename: file.name,
        total_files: files.length,
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

    // Queue processing jobs for each JSON file
    const boss = await QueueClient.getInstance()
    try {
      await boss.createQueue(PROCESS_JSON_QUEUE)
      console.log(`[API] Queue ${PROCESS_JSON_QUEUE} ready`)
    } catch (queueError) {
      console.log(
        `[API] Queue ${PROCESS_JSON_QUEUE} may already exist`,
        queueError instanceof Error ? queueError.message : queueError
      )
    }

    for (let i = 0; i < files.length; i++) {
      const fileData = files[i]
      const jobData: ProcessJsonFileJobData = {
        uploadJobId: uploadJob.id,
        userId: user.id,
        filename: fileData.filename,
        content: fileData.content,
        fileIndex: i,
        totalFiles: files.length,
      }

      await boss.send(PROCESS_JSON_QUEUE, jobData, {
        retryLimit: 3,
        retryDelay: 1000,
        retryBackoff: true,
      })

      console.log(`[API] Queued job for file ${i + 1}/${files.length}: ${fileData.filename}`)
    }

    // Update job status to processing
    await supabase
      .from('upload_jobs')
      .update({ status: 'processing' })
      .eq('id', uploadJob.id)

    return NextResponse.json({
      uploadJobId: uploadJob.id,
      totalFiles: files.length,
      message: `Successfully queued ${files.length} files for processing`,
    })
  } catch (error) {
    console.error('[API] Error handling ZIP upload:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
