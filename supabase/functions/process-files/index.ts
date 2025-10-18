// Supabase Edge Function: process-files
// Processes pending file upload jobs from the file_processing_jobs table
// Can be triggered manually or via cron job

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BATCH_SIZE = 5 // Process up to 5 jobs at a time

interface FileJob {
  id: string
  upload_job_id: string
  user_id: string
  filename: string
  file_path: string
  file_index: number
  total_files: number
  retry_count: number
  max_retries: number
}

interface ListenInsert {
  user_id: string
  ts: string
  ms_played: number | null
  artist: string | null
  track: string | null
  source?: string
}

interface SpotifyRawItem {
  ts?: string
  endTime?: string
  ms_played?: number
  msPlayed?: number
  master_metadata_album_artist_name?: string
  artistName?: string
  master_metadata_track_name?: string
  trackName?: string
}

/**
 * Parse and map Spotify JSON to database format
 */
function parseAndMapJson(content: string, userId: string): { success: true; records: ListenInsert[] } | { success: false; error: string } {
  try {
    const data = JSON.parse(content)

    if (!Array.isArray(data)) {
      return { success: false, error: 'JSON content is not an array' }
    }

    if (data.length === 0) {
      return { success: false, error: 'JSON array is empty' }
    }

    const records: ListenInsert[] = data.map((item: SpotifyRawItem) => ({
      user_id: userId,
      ts: item.ts || item.endTime || '',
      ms_played: item.ms_played ?? item.msPlayed ?? null,
      artist: item.master_metadata_album_artist_name ?? item.artistName ?? null,
      track: item.master_metadata_track_name ?? item.trackName ?? null,
      source: 'json',
    }))

    return { success: true, records }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown parse error' }
  }
}

/**
 * Process a single file job
 */
async function processFileJob(
  supabase: ReturnType<typeof createClient>,
  job: FileJob
): Promise<{ success: boolean; error?: string; recordCount?: number }> {
  console.log(`[Job ${job.id}] Processing ${job.filename} (${job.file_index + 1}/${job.total_files})`)

  try {
    // Download file from Storage
    console.log(`[Job ${job.id}] Downloading file from storage: ${job.file_path}`)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('file-uploads')
      .download(job.file_path)

    if (downloadError || !fileData) {
      console.error(`[Job ${job.id}] Download error:`, downloadError)
      return { success: false, error: `Failed to download file: ${downloadError?.message || 'Unknown error'}` }
    }

    // Convert blob to text
    const fileContent = await fileData.text()
    console.log(`[Job ${job.id}] Downloaded ${fileContent.length} bytes`)

    // Parse JSON
    const parseResult = parseAndMapJson(fileContent, job.user_id)

    if (!parseResult.success) {
      console.error(`[Job ${job.id}] Parse error:`, parseResult.error)
      return { success: false, error: parseResult.error }
    }

    const records = parseResult.records
    console.log(`[Job ${job.id}] Parsed ${records.length} records`)

    // Insert records in batches
    const BATCH_SIZE = 500
    let insertedCount = 0

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)

      const { error } = await supabase.from('listens').insert(batch)

      if (error) {
        console.error(`[Job ${job.id}] Insert error:`, error)
        return { success: false, error: `Failed to insert batch: ${error.message}` }
      }

      insertedCount += batch.length
      console.log(`[Job ${job.id}] Inserted ${insertedCount}/${records.length} records`)
    }

    // Update upload job progress
    const { data: currentJob, error: fetchError } = await supabase
      .from('upload_jobs')
      .select('processed_files, total_records')
      .eq('id', job.upload_job_id)
      .single()

    if (fetchError) {
      console.error(`[Job ${job.id}] Failed to fetch upload job:`, fetchError)
      return { success: false, error: `Failed to fetch upload job: ${fetchError.message}` }
    }

    const newProcessedFiles = (currentJob.processed_files || 0) + 1
    const newTotalRecords = (currentJob.total_records || 0) + insertedCount

    const { error: updateError } = await supabase
      .from('upload_jobs')
      .update({
        processed_files: newProcessedFiles,
        total_records: newTotalRecords,
        status: newProcessedFiles >= job.total_files ? 'completed' : 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.upload_job_id)

    if (updateError) {
      console.error(`[Job ${job.id}] Failed to update upload job:`, updateError)
      return { success: false, error: `Failed to update upload job: ${updateError.message}` }
    }

    // If this was the last file, refresh analytics views
    if (newProcessedFiles >= job.total_files) {
      console.log(`[Job ${job.id}] All files processed, refreshing analytics views`)

      const { error: refreshError } = await supabase.rpc('refresh_analytics_views')

      if (refreshError) {
        console.error(`[Job ${job.id}] Failed to refresh analytics views:`, refreshError)
        // Don't fail - data is already inserted
      } else {
        console.log(`[Job ${job.id}] Analytics views refreshed`)
      }
    }

    // Delete file from storage after successful processing
    console.log(`[Job ${job.id}] Cleaning up storage file: ${job.file_path}`)
    const { error: deleteError } = await supabase.storage
      .from('file-uploads')
      .remove([job.file_path])

    if (deleteError) {
      console.error(`[Job ${job.id}] Failed to delete file from storage:`, deleteError)
      // Don't fail - file can be cleaned up later
    }

    console.log(`[Job ${job.id}] Completed successfully`)
    return { success: true, recordCount: insertedCount }

  } catch (error) {
    console.error(`[Job ${job.id}] Unexpected error:`, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log('[Worker] Processing pending file jobs...')

    // First, reset stale jobs
    const { data: resetData, error: resetError } = await supabase.rpc('reset_stale_jobs')

    if (resetError) {
      console.error('[Worker] Error resetting stale jobs:', resetError)
    } else if (resetData && resetData[0]?.reset_count > 0) {
      console.log(`[Worker] Reset ${resetData[0].reset_count} stale jobs`)
    }

    // Claim pending jobs
    const { data: jobs, error: claimError } = await supabase
      .rpc('claim_pending_jobs', { batch_size: BATCH_SIZE })

    if (claimError) {
      console.error('[Worker] Error claiming jobs:', claimError)
      return new Response(
        JSON.stringify({ error: 'Failed to claim jobs', details: claimError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!jobs || jobs.length === 0) {
      console.log('[Worker] No pending jobs found')
      return new Response(
        JSON.stringify({ message: 'No pending jobs', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Worker] Claimed ${jobs.length} jobs`)

    // Process each job
    const results = []
    for (const job of jobs as FileJob[]) {
      const result = await processFileJob(supabase, job)

      if (result.success) {
        // Mark as completed
        const { error: updateError } = await supabase
          .from('file_processing_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        if (updateError) {
          console.error(`[Job ${job.id}] Error updating status:`, updateError)
        }

        results.push({ jobId: job.id, filename: job.filename, success: true, records: result.recordCount })
      } else {
        // Mark as failed or retry
        const shouldRetry = job.retry_count < job.max_retries

        const { error: updateError } = await supabase
          .from('file_processing_jobs')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            retry_count: job.retry_count + 1,
            error_message: result.error,
            started_at: null, // Clear started_at for retry
          })
          .eq('id', job.id)

        if (updateError) {
          console.error(`[Job ${job.id}] Error updating failed status:`, updateError)
        }

        results.push({ jobId: job.id, filename: job.filename, success: false, error: result.error, willRetry: shouldRetry })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`[Worker] Processed ${results.length} jobs: ${successCount} success, ${failCount} failed`)

    return new Response(
      JSON.stringify({
        message: 'Jobs processed',
        processed: results.length,
        success: successCount,
        failed: failCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Worker] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
