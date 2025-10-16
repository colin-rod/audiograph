import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

import {
  ensureSupabaseConfig,
  getMissingSupabaseConfigMessage,
  getSupabaseConfig,
} from "./supabase/config"

let hasLoggedMissingConfigWarning = false

const getConfigOrLogWarning = () => {
  const config = getSupabaseConfig()

  if (!config) {
    if (!hasLoggedMissingConfigWarning && process.env.NODE_ENV !== "production") {
      console.warn(getMissingSupabaseConfigMessage())
      hasLoggedMissingConfigWarning = true
    }

    return null
  }

  return config
}

export const createSupabaseClient = () => {
  const { url, anonKey } = ensureSupabaseConfig()
  return createClientComponentClient({
    supabaseUrl: url,
    supabaseKey: anonKey,
  })
}

export const createSupabaseBrowserClient = () => {
  const config = getConfigOrLogWarning()

  if (!config) {
    throw new Error(getMissingSupabaseConfigMessage())
  }

  const { url, anonKey } = config

  return createClientComponentClient({
    supabaseUrl: url,
    supabaseKey: anonKey,
  })
}

let supabaseInstance: ReturnType<typeof createClientComponentClient> | null = null

export const supabase = new Proxy({} as ReturnType<typeof createClientComponentClient>, {
  get(_target, prop) {
    if (!supabaseInstance) {
      const { url, anonKey } = ensureSupabaseConfig()
      supabaseInstance = createClientComponentClient({
        supabaseUrl: url,
        supabaseKey: anonKey,
      })
    }

    return supabaseInstance[prop as keyof typeof supabaseInstance]
  },
})
