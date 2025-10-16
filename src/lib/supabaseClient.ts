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
/**
 * Validates and retrieves Supabase configuration from environment variables
 * Provides helpful error messages for missing configuration
 */
const getSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Check if URL is missing or placeholder
  if (!supabaseUrl || supabaseUrl.includes("your_supabase_url") || supabaseUrl.includes("xxxxx")) {
    throw new Error(
      "❌ Supabase configuration error: NEXT_PUBLIC_SUPABASE_URL is not configured.\n\n" +
      "To fix this:\n" +
      "1. Copy .env.example to .env.local: cp .env.example .env.local\n" +
      "2. Get your Supabase URL from: https://app.supabase.com/project/_/settings/api\n" +
      "3. Update NEXT_PUBLIC_SUPABASE_URL in .env.local\n" +
      "4. Restart the development server\n\n" +
      "See docs/SUPABASE_SETUP.md for detailed setup instructions."
    )
  }

  // Check if anon key is missing or placeholder
  if (!supabaseAnonKey || supabaseAnonKey.includes("your_supabase") || supabaseAnonKey.length < 20) {
    throw new Error(
      "❌ Supabase configuration error: NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.\n\n" +
      "To fix this:\n" +
      "1. Copy .env.example to .env.local: cp .env.example .env.local\n" +
      "2. Get your anon key from: https://app.supabase.com/project/_/settings/api\n" +
      "3. Update NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local\n" +
      "4. Restart the development server\n\n" +
      "See docs/SUPABASE_SETUP.md for detailed setup instructions."
    )
  }

  // Validate URL format
  try {
    const url = new URL(supabaseUrl)
    if (!url.hostname.includes("supabase")) {
      console.warn("⚠️  Warning: NEXT_PUBLIC_SUPABASE_URL doesn't appear to be a Supabase URL")
    }
  } catch {
    throw new Error(
      `❌ Supabase configuration error: NEXT_PUBLIC_SUPABASE_URL is not a valid URL.\n\n` +
      `Current value: "${supabaseUrl}"\n` +
      `Expected format: https://xxxxx.supabase.co\n\n` +
      `See docs/SUPABASE_SETUP.md for setup instructions.`
    )
  }

  return config
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

export const createSupabaseClient = () => createClient()

export const createSupabaseBrowserClient = () => createClient()

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
