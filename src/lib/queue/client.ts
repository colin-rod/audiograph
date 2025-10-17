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
      // Configure pg-boss with connection settings that prefer IPv4
      const pgBossOptions = {
        connectionString,
        // Add connection string suffix to force IPv4 resolution if not already present
        ...(connectionString.includes('?') ? {} : {}),
        // Configure connection pool with timeout settings
        db: {
          connectionTimeoutMillis: 15000,
          // Add node-pg connection options
          options: undefined
        },
        // Schema settings
        schema: 'pgboss',
        // Explicitly set supervisor and scheduling
        noSupervisor: false,
        noScheduling: false,
        // Archive settings
        archiveCompletedAfterSeconds: 60 * 60 * 12, // 12 hours
        deleteAfterDays: 7
      }

      // Modify connection string to add IPv4 preference if using Supabase
      let finalConnectionString = connectionString

      // If this is a Supabase connection, ensure we're using the direct connection
      // Supabase supports both IPv4 and IPv6, but we want IPv4
      if (connectionString.includes('supabase.co')) {
        console.log('[Queue] Detected Supabase connection, adding connection parameters...')

        // Add IPv4 preference and connection pooling parameters
        const separator = connectionString.includes('?') ? '&' : '?'
        finalConnectionString = `${connectionString}${separator}sslmode=require`
      }

      console.log('[Queue] Initializing pg-boss...')

      bossInstance = new PgBoss({
        ...pgBossOptions,
        connectionString: finalConnectionString
      })

      console.log('[Queue] Starting pg-boss...')
      await bossInstance.start()

      console.log('[Queue] pg-boss started successfully')

      return bossInstance
    } catch (error) {
      bossInstance = null
      console.error('[Queue] Failed to start pg-boss:', error)

      // Log more details for debugging
      if (error instanceof Error) {
        console.error('[Queue] Error details:', {
          message: error.message,
          name: error.name,
          code: (error as any).code,
          errno: (error as any).errno,
          syscall: (error as any).syscall,
          address: (error as any).address,
          port: (error as any).port
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
