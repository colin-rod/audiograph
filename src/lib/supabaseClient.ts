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

const createClient = () => {
  const config = readSupabaseConfig()

  if (!config) {
    throw new Error("Supabase environment variables are not configured.")
  }

  return createClientComponentClient({
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseAnonKey,
  })
}

export const createSupabaseClient = () => createClient()

export const createSupabaseBrowserClient = () => createClient()

