import { cookies } from "next/headers"
import {
  createClientComponentClient,
  createRouteHandlerClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined")
}

if (!supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined")
}

export const createSupabaseClient = () =>
  createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

export const createSupabaseBrowserClient = () =>
  createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
    isSingleton: false,
  })

export const createSupabaseServerClient = () =>
  createServerComponentClient(
    {
      cookies: () => cookies(),
    },
    {
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    },
  )

export const createSupabaseRouteHandlerClient = () =>
  createRouteHandlerClient(
    {
      cookies: () => cookies(),
    },
    {
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    },
  )
