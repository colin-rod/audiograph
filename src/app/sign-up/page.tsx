"use client"

import { FormEvent, Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export const dynamic = "force-dynamic"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabaseClient"

const buildCallbackMessage = (message: string | null, error: string | null) => {
  if (error) {
    return { intent: "error" as const, text: error }
  }

  switch (message) {
    case "signup-success":
      return {
        intent: "success" as const,
        text: "Account created! Check your email to confirm your account.",
      }
    default:
      return null
  }
}

const SignUpContent = () => {
  const searchParams = useSearchParams()
  const messageParam = searchParams.get("message")
  const errorParam = searchParams.get("error")
  const nextParam = searchParams.get("next")
  const initialMessage = useMemo(
    () => buildCallbackMessage(messageParam, errorParam),
    [messageParam, errorParam]
  )

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(
    initialMessage?.text ?? null
  )
  const [statusIntent, setStatusIntent] = useState<"success" | "error" | "info" | null>(
    initialMessage?.intent ?? null
  )

  const handlePasswordSignUp = async () => {
    const trimmedEmail = email.trim()

    if (!trimmedEmail || !password || !confirmPassword) {
      setStatus("error")
      setStatusIntent("error")
      setStatusMessage("Please fill in all fields.")
      return
    }

    if (password !== confirmPassword) {
      setStatus("error")
      setStatusIntent("error")
      setStatusMessage("Passwords do not match.")
      return
    }

    if (password.length < 6) {
      setStatus("error")
      setStatusIntent("error")
      setStatusMessage("Password must be at least 6 characters long.")
      return
    }

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin)
      if (nextParam) {
        callbackUrl.searchParams.set("next", nextParam)
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: password,
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      })

      if (error) {
        setStatus("error")
        setStatusIntent("error")
        setStatusMessage(error.message ?? "Unable to create account.")
        return
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setStatus("success")
        setStatusIntent("success")
        setStatusMessage(
          "Account created! Check your email to confirm your account before signing in."
        )
        setEmail("")
        setPassword("")
        setConfirmPassword("")
      } else if (data.session) {
        // Auto sign-in successful
        const redirectUrl = nextParam ?? "/dashboard"
        window.location.href = redirectUrl
      }
    } catch (error) {
      setStatus("error")
      setStatusIntent("error")
      setStatusMessage(
        error instanceof Error ? error.message : "Unexpected error occurred."
      )
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setStatus("loading")
    setStatusIntent(null)
    setStatusMessage(null)

    await handlePasswordSignUp()
  }

  const handleOAuthSignUp = async (provider: "google" | "spotify") => {
    setStatus("loading")
    setStatusIntent(null)
    setStatusMessage(null)

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin)
      if (nextParam) {
        callbackUrl.searchParams.set("next", nextParam)
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: callbackUrl.toString(),
          scopes: provider === "spotify" ? "user-read-email user-library-read user-read-recently-played" : undefined,
        },
      })

      if (error) {
        setStatus("error")
        setStatusIntent("error")
        setStatusMessage(error.message ?? `Unable to sign up with ${provider}.`)
        return
      }

      // OAuth redirect happens automatically
    } catch (error) {
      setStatus("error")
      setStatusIntent("error")
      setStatusMessage(
        error instanceof Error ? error.message : "Unexpected error occurred."
      )
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Sign up to start tracking your music listening history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusMessage ? (
            <p
              className={`mb-4 text-sm ${
                statusIntent === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : statusIntent === "info"
                    ? "text-muted-foreground"
                    : "text-destructive"
              }`}
            >
              {statusMessage}
            </p>
          ) : null}

          {/* OAuth Providers */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={status === "loading"}
              onClick={() => handleOAuthSignUp("google")}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={status === "loading"}
              onClick={() => handleOAuthSignUp("spotify")}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Continue with Spotify
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or sign up with email
              </span>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={status === "loading"}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a password (min. 6 characters)"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={status === "loading"}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm password
              </label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={status === "loading"}
                required
              />
            </div>

            <div className="space-y-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={status === "loading"}
              >
                {status === "loading" ? "Creating account..." : "Create account"}
              </Button>

              <Button
                variant="secondary"
                className="w-full"
                asChild
              >
                <Link href="/" aria-label="Continue without signing up">
                  Continue without login
                </Link>
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="font-medium text-primary" href="/sign-in">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

const SignUpFallback = () => (
  <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4 py-12">
    <Card className="w-full max-w-md animate-pulse">
      <CardHeader>
        <CardTitle className="text-2xl">Loading sign up...</CardTitle>
        <CardDescription>
          Preparing the sign-up experience. Please wait a moment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-4 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  </div>
)

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpFallback />}>
      <SignUpContent />
    </Suspense>
  )
}
