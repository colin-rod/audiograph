import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

import { getSupabaseConfigOrWarn } from "./config"

type ServerClient = ReturnType<typeof createServerComponentClient>

export const createSupabaseServerClient = (): ServerClient | null => {
  const config = getSupabaseConfigOrWarn("supabase-server")

  if (!config) {
    return null
  }

  return createServerComponentClient({
    cookies,
  })
}
