#!/usr/bin/env node

/**
 * Background Worker for Processing Upload Jobs
 *
 * This worker subscribes to the 'process-json-file' job queue
 * and processes Spotify JSON files uploaded via ZIP.
 *
 * Usage:
 *   npm run worker        # Production
 *   npm run worker:dev    # Development with watch mode
 */

import { QueueClient } from '../lib/queue/client'
import { processJsonFileJob, type ProcessJsonFileJobData } from '../lib/queue/processor'

async function startWorker() {
  console.log('[Worker] Starting upload processor worker...')

  try {
    // Get queue client
    const boss = await QueueClient.getInstance()

    // Initialize the queue by sending a dummy job
    // pg-boss requires the queue to exist before workers can subscribe
    console.log('[Worker] Initializing queue...')
    try {
      await boss.send('process-json-file', {
        uploadJobId: '__init__',
        userId: '__init__',
        filename: '__init__',
        content: '[]',
        fileIndex: 0,
        totalFiles: 0
      }, {
        expireInSeconds: 1
      })
      console.log('[Worker] Queue initialized')
    } catch (initError) {
      console.log('[Worker] Queue may already exist:', initError instanceof Error ? initError.message : String(initError))
    }

    // Subscribe to job queue
    console.log('[Worker] Setting up job handler...')

    await boss.work<ProcessJsonFileJobData>(
      'process-json-file',
      async (jobs) => {
        // pg-boss returns array of jobs, process each one
        for (const job of jobs) {
          try {
            // Skip initialization jobs
            if (job.data.uploadJobId === '__init__') {
              console.log('[Worker] Skipping initialization job')
              continue
            }

            await processJsonFileJob(job as { data: ProcessJsonFileJobData })
          } catch (error) {
            console.error('[Worker] Job failed:', error)
            throw error // Re-throw to let pg-boss handle retries
          }
        }
      }
    )

    console.log('[Worker] Upload processor worker started successfully')
    console.log('[Worker] Listening for jobs on queue: process-json-file')
    console.log('[Worker] Press Ctrl+C to stop')

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[Worker] Received ${signal}, shutting down gracefully...`)
      try {
        await QueueClient.stop()
        console.log('[Worker] Worker stopped successfully')
        process.exit(0)
      } catch (error) {
        console.error('[Worker] Error during shutdown:', error)
        process.exit(1)
      }
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))

  } catch (error) {
    console.error('[Worker] Failed to start worker:', error)
    process.exit(1)
  }
}

// Start the worker
startWorker()
