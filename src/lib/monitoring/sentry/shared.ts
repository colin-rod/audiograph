export interface SentryDsnComponents {
  protocol: string
  host: string
  port?: string
  projectId: string
  publicKey: string
  secretKey?: string
}

export function parseSentryDsn(dsn: string): SentryDsnComponents | null {
  try {
    const url = new URL(dsn)

    const projectId = url.pathname.replace(/^\//, "").trim()
    if (!projectId) {
      return null
    }

    return {
      protocol: url.protocol,
      host: url.hostname,
      port: url.port || undefined,
      projectId,
      publicKey: decodeURIComponent(url.username),
      secretKey: url.password ? decodeURIComponent(url.password) : undefined,
    }
  } catch {
    return null
  }
}

export function createSentryStoreUrl(components: SentryDsnComponents): string {
  const portSegment = components.port ? `:${components.port}` : ""
  return `${components.protocol}//${components.host}${portSegment}/api/${components.projectId}/store/`
}

export function createSentryAuthHeader(
  components: SentryDsnComponents,
  clientName: string
): string {
  const parts = [
    "Sentry sentry_version=7",
    `sentry_client=${clientName}`,
    `sentry_key=${components.publicKey}`,
  ]

  if (components.secretKey) {
    parts.push(`sentry_secret=${components.secretKey}`)
  }

  return parts.join(", ")
}
