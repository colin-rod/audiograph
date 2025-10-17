import PgBoss from 'pg-boss'

/**
 * Singleton instance of PgBoss queue client
 */
let bossInstance: PgBoss | null = null

/**
 * Queue Client Manager
 * Provides singleton access to pg-boss queue
 */
export class QueueClient {
  /**
   * Get or create the pg-boss instance
   * @returns Connected PgBoss instance
   */
  static async getInstance(): Promise<PgBoss> {
    if (bossInstance) {
      return bossInstance
    }

    // Log environment variables for debugging (without exposing sensitive data)
    console.log('[Queue] Checking for DATABASE_URL...')
    console.log('[Queue] Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('POSTGRES')))

    // Try multiple possible environment variable names
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_PRIVATE_URL ||
      process.env.POSTGRES_PRISMA_URL

    if (!connectionString) {
      console.error('[Queue] DATABASE_URL not found. Available environment variables:')
      console.error('[Queue]', Object.keys(process.env).sort())
      throw new Error(
        'DATABASE_URL environment variable is not set. ' +
        'Please configure your database connection string in Railway settings. ' +
        'Tried: DATABASE_URL, POSTGRES_URL, DATABASE_PRIVATE_URL, POSTGRES_PRISMA_URL'
      )
    }

    console.log('[Queue] Connection string found, attempting to connect...')

    try {
      // Modify connection string to add connection parameters if using Supabase
      let finalConnectionString = connectionString

      // If this is a Supabase connection, ensure we're using the connection pooler
      if (connectionString.includes('supabase.co')) {
        console.log('[Queue] Detected Supabase connection, adding connection parameters...')

        // Add SSL mode if not already present
        const separator = connectionString.includes('?') ? '&' : '?'
        finalConnectionString = `${connectionString}${separator}sslmode=require`
      }

      console.log('[Queue] Initializing pg-boss...')

      // Create pg-boss instance with connection string
      bossInstance = new PgBoss(finalConnectionString)

      console.log('[Queue] Starting pg-boss...')
      await bossInstance.start()

      console.log('[Queue] pg-boss started successfully')

      return bossInstance
    } catch (error) {
      bossInstance = null
      console.error('[Queue] Failed to start pg-boss:', error)

      // Log more details for debugging
      if (error instanceof Error) {
        // Type guard for NodeJS.ErrnoException properties
        const nodeError = error as Error & {
          code?: string
          errno?: number
          syscall?: string
          address?: string
          port?: number
        }

        console.error('[Queue] Error details:', {
          message: error.message,
          name: error.name,
          code: nodeError.code,
          errno: nodeError.errno,
          syscall: nodeError.syscall,
          address: nodeError.address,
          port: nodeError.port
        })
      }

      throw new Error(
        `Failed to start pg-boss: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Stop the pg-boss instance
   * Should be called during application shutdown
   */
  static async stop(): Promise<void> {
    if (bossInstance) {
      await bossInstance.stop()
      bossInstance = null
      console.log('[Queue] pg-boss stopped')
    }
  }

  /**
   * Reset the instance (for testing purposes)
   * @internal
   */
  static resetInstance(): void {
    bossInstance = null
  }
}
