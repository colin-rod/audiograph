import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

const missingConfigMessage =
  "Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set."

let hasLoggedMissingConfigWarning = false

const getSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!hasLoggedMissingConfigWarning && process.env.NODE_ENV !== "production") {
      console.warn(missingConfigMessage)
      hasLoggedMissingConfigWarning = true
    }
    return null
  }

  return { supabaseUrl, supabaseAnonKey }
}

const ensureSupabaseConfig = () => {
  const config = getSupabaseConfig()
  if (!config) {
    throw new Error(missingConfigMessage)
  }
  return config
}

export const createSupabaseClient = () => {
  const { supabaseUrl, supabaseAnonKey } = ensureSupabaseConfig()
  return createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })
}

export const createSupabaseBrowserClient = () => {
  const { supabaseUrl, supabaseAnonKey } = ensureSupabaseConfig()
  return createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })
}

let supabaseInstance: ReturnType<typeof createClientComponentClient> | null = null

export const supabase = new Proxy({} as ReturnType<typeof createClientComponentClient>, {
  get(_target, prop) {
    if (!supabaseInstance) {
      const { supabaseUrl, supabaseAnonKey } = ensureSupabaseConfig()
      supabaseInstance = createClientComponentClient({
        supabaseUrl,
        supabaseKey: supabaseAnonKey,
      })
    }
    return supabaseInstance[prop as keyof typeof supabaseInstance]
  },
})

