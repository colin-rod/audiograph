export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerServerExceptionHandlers } = await import(
      './src/lib/monitoring/sentry/server'
    )

    registerServerExceptionHandlers()
  }
}
