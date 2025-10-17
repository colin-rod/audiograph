import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock pg-boss before importing the client
vi.mock('pg-boss', () => {
  const MockPgBoss = vi.fn().mockImplementation((connectionString: string) => {
    return {
      connectionString,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue('job-id-123'),
      work: vi.fn().mockResolvedValue(undefined)
    }
  })

  return { default: MockPgBoss }
})

import { QueueClient } from './client'
import PgBoss from 'pg-boss'

describe('QueueClient', () => {
  beforeEach(() => {
    // Clear any existing instance
    QueueClient.resetInstance()
    vi.clearAllMocks()
  })

  afterEach(() => {
    QueueClient.resetInstance()
  })

  it('creates singleton pg-boss instance', async () => {
    const originalEnv = process.env.DATABASE_URL
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb'

    const instance1 = await QueueClient.getInstance()
    const instance2 = await QueueClient.getInstance()

    expect(instance1).toBe(instance2)
    expect(PgBoss).toHaveBeenCalledTimes(1)

    // Restore env
    if (originalEnv) {
      process.env.DATABASE_URL = originalEnv
    } else {
      delete process.env.DATABASE_URL
    }
  })

  it('connects to PostgreSQL via connection string from env', async () => {
    const originalEnv = process.env.DATABASE_URL
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb'

    const instance = await QueueClient.getInstance()

    expect(PgBoss).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: 'postgresql://test:test@localhost:5432/testdb'
      })
    )

    expect(instance.start).toHaveBeenCalledTimes(1)

    // Restore env
    if (originalEnv) {
      process.env.DATABASE_URL = originalEnv
    } else {
      delete process.env.DATABASE_URL
    }
  })

  it('throws error when DATABASE_URL is not set', async () => {
    const originalEnv = process.env.DATABASE_URL
    delete process.env.DATABASE_URL

    QueueClient.resetInstance()

    await expect(QueueClient.getInstance()).rejects.toThrow(
      'DATABASE_URL environment variable is not set'
    )

    // Restore env
    if (originalEnv) {
      process.env.DATABASE_URL = originalEnv
    }
  })

  it('handles connection errors gracefully', async () => {
    const originalEnv = process.env.DATABASE_URL
    process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:5432/invalid'

    // Mock start to throw error
    const mockPgBoss = {
      start: vi.fn().mockRejectedValue(new Error('Connection failed')),
      stop: vi.fn()
    }
    vi.mocked(PgBoss).mockImplementationOnce(() => mockPgBoss as unknown as PgBoss)

    QueueClient.resetInstance()

    await expect(QueueClient.getInstance()).rejects.toThrow('Failed to start pg-boss')

    // Restore env
    if (originalEnv) {
      process.env.DATABASE_URL = originalEnv
    }
  })

  it('allows stopping the queue client', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb'

    const instance = await QueueClient.getInstance()
    await QueueClient.stop()

    expect(instance.stop).toHaveBeenCalledTimes(1)
  })
})
