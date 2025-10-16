import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

const getSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined")
  }

  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined")
  }

  return { supabaseUrl, supabaseAnonKey }
}

export const createSupabaseClient = () => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  return createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })
}

export const createSupabaseBrowserClient = () => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  return createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })
}

let supabaseInstance: ReturnType<typeof createClientComponentClient> | null = null

export const supabase = new Proxy({} as ReturnType<typeof createClientComponentClient>, {
  get(target, prop) {
    if (!supabaseInstance) {
      supabaseInstance = createSupabaseBrowserClient()
    }
    return supabaseInstance[prop as keyof typeof supabaseInstance]
  },
})

