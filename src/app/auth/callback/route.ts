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
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const redirectUrl = buildRedirectUrl(request, "/sign-in")
    redirectUrl.searchParams.set("message", "signin-error")
    redirectUrl.searchParams.set("error", error.message)
    return NextResponse.redirect(redirectUrl)
  }

  const redirectUrl = buildRedirectUrl(request, nextParam)
  return NextResponse.redirect(redirectUrl)
}
