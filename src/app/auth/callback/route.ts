import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

const DEFAULT_REDIRECT_PATH = "/dashboard"

const buildRedirectUrl = (request: NextRequest, path: string) => {
  const origin = request.nextUrl.origin
  return new URL(path, origin)
}

const sanitiseNextPath = (value: string | null) => {
  if (!value) return DEFAULT_REDIRECT_PATH
  return value.startsWith("/") ? value : DEFAULT_REDIRECT_PATH
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const nextParam = sanitiseNextPath(
    request.nextUrl.searchParams.get("next")
  )

  if (!code) {
    const redirectUrl = buildRedirectUrl(request, "/sign-in")
    redirectUrl.searchParams.set("message", "missing-code")
    return NextResponse.redirect(redirectUrl)
  }

  const supabase = createRouteHandlerClient({ cookies })
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const redirectUrl = buildRedirectUrl(request, "/sign-in")
    redirectUrl.searchParams.set("message", "signin-error")
    redirectUrl.searchParams.set("error", error.message)
    return NextResponse.redirect(redirectUrl)
  }

  // If this is a Spotify OAuth callback, store the provider tokens
  if (data?.session?.user?.app_metadata?.provider === 'spotify') {
    const providerToken = data.session.provider_token
    const providerRefreshToken = data.session.provider_refresh_token

    if (providerToken && providerRefreshToken) {
      // Store Spotify tokens in database
      // Default Spotify token expiry is 3600 seconds (1 hour)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: tokenError } = await (supabase.rpc as any)('upsert_spotify_token', {
        new_access_token: providerToken,
        new_refresh_token: providerRefreshToken,
        expires_in_seconds: 3600,
      })

      if (tokenError) {
        console.error('Failed to store Spotify tokens:', tokenError)
        // Don't block the auth flow, just log the error
      }
    }
  }

  const redirectUrl = buildRedirectUrl(request, nextParam)
  return NextResponse.redirect(redirectUrl)
}
