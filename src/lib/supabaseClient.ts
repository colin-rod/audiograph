import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

type SupabaseConfig = {
  supabaseUrl: string
  supabaseAnonKey: string
}

const readSupabaseConfig = (): SupabaseConfig | null => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return { supabaseUrl, supabaseAnonKey }
}

export const isSupabaseConfigured = () => readSupabaseConfig() !== null

export const ensureSupabaseConfig = () => {
  const config = readSupabaseConfig()

  if (!config) {
    throw new Error("Supabase environment variables are not configured.")
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
    isSingleton: false,
  })
}
