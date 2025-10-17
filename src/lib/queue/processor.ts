import { createClient } from '@supabase/supabase-js'
import { parseAndMapJson, type ListenInsert } from '../upload/spotify-mapper'

/**
 * Batch size for inserting records
 */
const BATCH_SIZE = 500

/**
 * Job data for processing a JSON file
 */
export type ProcessJsonFileJobData = {
  uploadJobId: string
  userId: string
  filename: string
  content: string
  fileIndex: number
  totalFiles: number
}

/**
 * Get Supabase service role client (bypasses RLS)
 */
function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * Process a single JSON file job
 * Parses the file, inserts records in batches, and updates job progress
 */
export async function processJsonFileJob(job: { data: ProcessJsonFileJobData }) {
  const { uploadJobId, userId, filename, content, fileIndex, totalFiles } = job.data

  console.log(
    `[Processor] Processing file ${fileIndex + 1}/${totalFiles}: ${filename} for upload ${uploadJobId}`
  )

  const supabase = getSupabaseServiceClient()

  try {
    // Parse and map JSON content
    const parseResult = parseAndMapJson(content, userId)

    if (!parseResult.success) {
      throw new Error(`Failed to parse ${filename}: ${parseResult.error}`)
    }

    const records = parseResult.records
    console.log(`[Processor] Parsed ${records.length} records from ${filename}`)

    // Insert records in batches
    let insertedCount = 0
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)

      const { error } = await supabase.from('listens').insert(batch)

      if (error) {
        throw new Error(`Failed to insert batch: ${error.message}`)
      }

      insertedCount += batch.length
      console.log(
        `[Processor] Inserted ${insertedCount}/${records.length} records from ${filename}`
      )
    }

    // Update upload job progress
    const { data: currentJob, error: fetchError } = await supabase
      .from('upload_jobs')
      .select('processed_files, total_records')
      .eq('id', uploadJobId)
      .single()

    if (fetchError) {
      console.error('[Processor] Failed to fetch current job status:', fetchError)
      throw new Error(`Failed to fetch job status: ${fetchError.message}`)
    }

    const newProcessedFiles = (currentJob.processed_files || 0) + 1
    const newTotalRecords = (currentJob.total_records || 0) + insertedCount

    const { error: updateError } = await supabase
      .from('upload_jobs')
      .update({
        processed_files: newProcessedFiles,
        total_records: newTotalRecords,
        status: newProcessedFiles >= totalFiles ? 'completed' : 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', uploadJobId)

    if (updateError) {
      console.error('[Processor] Failed to update job progress:', updateError)
      throw new Error(`Failed to update job progress: ${updateError.message}`)
    }

    // If this was the last file, refresh analytics views
    if (newProcessedFiles >= totalFiles) {
      console.log(`[Processor] All files processed for upload ${uploadJobId}, refreshing analytics views`)

      const { error: refreshError } = await supabase.rpc('refresh_analytics_views')

      if (refreshError) {
        console.error('[Processor] Failed to refresh analytics views:', refreshError)
        // Don't throw - the data is already inserted, this is just optimization
      } else {
        console.log('[Processor] Analytics views refreshed successfully')
      }
    }

    console.log(`[Processor] Completed processing ${filename} for upload ${uploadJobId}`)
  } catch (error) {
    console.error(`[Processor] Error processing ${filename}:`, error)

    // Update job status to failed
    const { error: updateError } = await supabase
      .from('upload_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', uploadJobId)

    if (updateError) {
      console.error('[Processor] Failed to update job error status:', updateError)
    }

    throw error
  }
}
