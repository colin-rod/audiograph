export type SupabaseConfig = {
  url: string
  anonKey: string
}

const missingConfigMessage =
  "Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set."

const warnedScopes = new Set<string>()

const readEnvConfig = (): SupabaseConfig | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return null
  }

  return { url, anonKey }
}

export const getSupabaseConfig = (): SupabaseConfig | null => readEnvConfig()

export const ensureSupabaseConfig = (): SupabaseConfig => {
  const config = readEnvConfig()

  if (!config) {
    throw new Error(missingConfigMessage)
  }

  return config
}

export const warnMissingSupabaseConfig = (scope: string) => {
  if (process.env.NODE_ENV === "production") {
    return
  }

  if (warnedScopes.has(scope)) {
    return
  }

  warnedScopes.add(scope)
  console.warn(`[${scope}] ${missingConfigMessage}`)
}

export const getSupabaseConfigOrWarn = (
  scope: string
): SupabaseConfig | null => {
  const config = readEnvConfig()

  if (!config) {
    warnMissingSupabaseConfig(scope)
    return null
  }

  return config
}

export const getMissingSupabaseConfigMessage = () => missingConfigMessage
