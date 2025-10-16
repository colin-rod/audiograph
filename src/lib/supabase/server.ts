import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

const missingConfigMessage =
  "Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set."

let hasWarnedMissingServerConfig = false

type ServerClient = ReturnType<typeof createServerComponentClient>

export const createSupabaseServerClient = (): ServerClient | null => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!hasWarnedMissingServerConfig && process.env.NODE_ENV !== "production") {
      console.warn(missingConfigMessage)
      hasWarnedMissingServerConfig = true
    }
    return null
  }

  return createServerComponentClient({
    cookies,
  })
}
