import { registerServerExceptionHandlers } from './src/lib/monitoring/sentry/server'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    registerServerExceptionHandlers()
  }
}
