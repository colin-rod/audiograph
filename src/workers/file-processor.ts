#!/usr/bin/env node

/**
 * File Processing Worker
 *
 * Polls the database for pending file processing jobs and processes them.
 * This replaces pg-boss for better serverless compatibility with Vercel.
 *
 * Usage:
 *   npm run worker        # Production
 *   npm run worker:dev    # Development with watch mode
 */

import { createClient } from '@supabase/supabase-js'
import { processJsonFileJob, type ProcessJsonFileJobData } from '../lib/queue/processor'

const POLL_INTERVAL_MS = 2000 // Poll every 2 seconds
const BATCH_SIZE = 5 // Process up to 5 jobs at a time
const STALE_JOB_CHECK_INTERVAL_MS = 60000 // Check for stale jobs every minute

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
 * Reset stale jobs that have been processing for too long
 */
async function resetStaleJobs(supabase: ReturnType<typeof getSupabaseServiceClient>) {
  console.log('[Worker] Checking for stale jobs...')
  try {
    const { data, error } = await supabase.rpc('reset_stale_jobs')

    if (error) {
      console.error('[Worker] Error resetting stale jobs:', error)
    } else if (data && data[0]?.reset_count > 0) {
      console.log(`[Worker] Reset ${data[0].reset_count} stale jobs`)
    }
  } catch (error) {
    console.error('[Worker] Failed to reset stale jobs:', error)
  }
}

/**
 * Process a batch of pending jobs
 */
async function processPendingJobs(supabase: ReturnType<typeof getSupabaseServiceClient>) {
  try {
    // Claim pending jobs atomically
    const { data: jobs, error } = await supabase
      .rpc('claim_pending_jobs', { batch_size: BATCH_SIZE })

    if (error) {
      console.error('[Worker] Error claiming jobs:', error)
      return
    }

    if (!jobs || jobs.length === 0) {
      return // No pending jobs
    }

    console.log(`[Worker] Claimed ${jobs.length} jobs for processing`)

    // Process each job
    for (const job of jobs) {
      try {
        console.log(`[Worker] Processing job ${job.id}: ${job.filename}`)

        // Convert database job to processor format
        const jobData: ProcessJsonFileJobData = {
          uploadJobId: job.upload_job_id,
          userId: job.user_id,
          filename: job.filename,
          content: job.file_content,
          fileIndex: job.file_index,
          totalFiles: job.total_files
        }

        // Process the job
        await processJsonFileJob({ data: jobData })

        // Mark as completed
        const { error: updateError } = await supabase
          .from('file_processing_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id)

        if (updateError) {
          console.error(`[Worker] Error updating job ${job.id} status:`, updateError)
        } else {
          console.log(`[Worker] Completed job ${job.id}`)
        }

      } catch (error) {
        console.error(`[Worker] Error processing job ${job.id}:`, error)

        // Mark as failed or retry
        const shouldRetry = (job.retry_count || 0) < (job.max_retries || 3)

        const { error: updateError } = await supabase
          .from('file_processing_jobs')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            retry_count: (job.retry_count || 0) + 1,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            started_at: null // Clear started_at for retry
          })
          .eq('id', job.id)

        if (updateError) {
          console.error(`[Worker] Error updating failed job ${job.id}:`, updateError)
        }
      }
    }

  } catch (error) {
    console.error('[Worker] Error in processPendingJobs:', error)
  }
}

/**
 * Main worker loop
 */
async function startWorker() {
  console.log('[Worker] Starting file processor worker...')
  console.log(`[Worker] Poll interval: ${POLL_INTERVAL_MS}ms`)
  console.log(`[Worker] Batch size: ${BATCH_SIZE}`)

  let supabase: ReturnType<typeof getSupabaseServiceClient>
  try {
    supabase = getSupabaseServiceClient()
    console.log('[Worker] Connected to Supabase')
  } catch (error) {
    console.error('[Worker] Failed to connect to Supabase:', error)
    process.exit(1)
  }

  // Set up polling interval
  const pollInterval = setInterval(() => {
    processPendingJobs(supabase)
  }, POLL_INTERVAL_MS)

  // Set up stale job check interval
  const staleJobInterval = setInterval(() => {
    resetStaleJobs(supabase)
  }, STALE_JOB_CHECK_INTERVAL_MS)

  // Initial check for stale jobs
  await resetStaleJobs(supabase)

  // Initial processing
  await processPendingJobs(supabase)

  console.log('[Worker] Worker started successfully')
  console.log('[Worker] Press Ctrl+C to stop')

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\n[Worker] Received ${signal}, shutting down gracefully...`)
    clearInterval(pollInterval)
    clearInterval(staleJobInterval)
    console.log('[Worker] Worker stopped successfully')
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

// Start the worker
startWorker()
