import { cookies } from "next/headers"
import {
  createRouteHandlerClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs"

import { ensureSupabaseConfig } from "../supabaseClient"

export const createSupabaseServerClient = () => {
  const { supabaseUrl, supabaseAnonKey } = ensureSupabaseConfig()

  return createServerComponentClient(
    {
      cookies: () => cookies(),
    },
    {
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    }
  )
}

export const createSupabaseRouteHandlerClient = () => {
  const { supabaseUrl, supabaseAnonKey } = ensureSupabaseConfig()

  return createRouteHandlerClient(
    {
      cookies: () => cookies(),
    },
    {
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    }
  )
}
