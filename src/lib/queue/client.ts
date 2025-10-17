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

    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is not set. ' +
        'Please configure your database connection string.'
      )
    }

    try {
      bossInstance = new PgBoss(connectionString)

      await bossInstance.start()

      console.log('[Queue] pg-boss started successfully')

      return bossInstance
    } catch (error) {
      bossInstance = null
      console.error('[Queue] Failed to start pg-boss:', error)
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
