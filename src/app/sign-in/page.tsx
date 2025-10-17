"use client"

import { FormEvent, Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

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
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabaseClient"

const buildCallbackMessage = (message: string | null, error: string | null) => {
  if (error) {
    return { intent: "error" as const, text: error }
  }

  switch (message) {
    case "missing-code":
      return {
        intent: "error" as const,
        text: "We couldn't complete the sign-in link. Please request a new email.",
      }
    case "signin-error":
      return {
        intent: "error" as const,
        text: "There was a problem completing your sign-in link. Please try again.",
      }
    case "signed-out":
      return {
        intent: "info" as const,
        text: "You've been signed out. Use the form below to sign in again.",
      }
    default:
      return null
  }
}

const SignInContent = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const messageParam = searchParams.get("message")
  const errorParam = searchParams.get("error")
  const initialMessage = useMemo(
    () => buildCallbackMessage(messageParam, errorParam),
    [messageParam, errorParam]
  )

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(
    initialMessage?.text ?? null
  )
  const [statusIntent, setStatusIntent] = useState<"success" | "error" | "info" | null>(
    initialMessage?.intent ?? null
  )
  const [authTab, setAuthTab] = useState<"magic" | "password">("magic")
  const [passwordMode, setPasswordMode] = useState<"sign-in" | "sign-up">(
    "sign-in"
  )
  const [oauthLoading, setOauthLoading] = useState<"google" | "spotify" | null>(
    null
  )

  const handleOAuthSignIn = async (provider: "google" | "spotify") => {
    setOauthLoading(provider)
    setStatus("loading")
    setStatusIntent(null)
    setStatusMessage(null)

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      })

      if (error) {
        setStatus("error")
        setStatusIntent("error")
        setStatusMessage(
          error.message ?? "Unable to start the sign-in flow. Please try again."
        )
        setOauthLoading(null)
      } else {
        setStatus("success")
        setStatusIntent("info")
        setStatusMessage("Redirecting you to complete sign-in...")
      }
    } catch (error) {
      setStatus("error")
      setStatusIntent("error")
      setStatusMessage(
        error instanceof Error ? error.message : "Unexpected error occurred."
      )
      setOauthLoading(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setStatus("error")
      setStatusIntent("error")
      setStatusMessage("Please enter your email address.")
      return
    }

    setOauthLoading(null)
    setStatusIntent(null)
    setStatusMessage(null)

    if (authTab === "magic") {
      setStatus("loading")

      try {
        const redirectUrl = `${window.location.origin}/auth/callback`
        const { error } = await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            emailRedirectTo: redirectUrl,
          },
        })

        if (error) {
          setStatus("error")
          setStatusIntent("error")
          setStatusMessage(error.message ?? "Unable to send sign-in email.")
          return
        }

        setStatus("success")
        setStatusIntent("success")
        setStatusMessage(
          "Check your inbox for a sign-in link. It may take a moment to arrive."
        )
        setEmail("")
      } catch (error) {
        setStatus("error")
        setStatusIntent("error")
        setStatusMessage(
          error instanceof Error ? error.message : "Unexpected error occurred."
        )
      }

      return
    }

    if (!password) {
      setStatus("error")
      setStatusIntent("error")
      setStatusMessage("Please enter your password.")
      return
    }

    if (password.length < 6) {
      setStatus("error")
      setStatusIntent("error")
      setStatusMessage("Passwords must be at least 6 characters long.")
      return
    }

    setStatus("loading")

    try {
      if (passwordMode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })

        if (error) {
          setStatus("error")
          setStatusIntent("error")
          setStatusMessage(error.message ?? "Unable to sign in with password.")
          return
        }

        setStatus("success")
        setStatusIntent("success")
        setStatusMessage("Signed in successfully. Redirecting...")
        setEmail("")
        setPassword("")
        router.push("/dashboard")
        return
      }

      const redirectUrl = `${window.location.origin}/auth/callback`
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      })

      if (error) {
        setStatus("error")
        setStatusIntent("error")
        setStatusMessage(error.message ?? "Unable to create your account.")
        return
      }

      setEmail("")
      setPassword("")

      if (data.session) {
        setStatus("success")
        setStatusIntent("success")
        setStatusMessage("Account created successfully. Redirecting...")
        router.push("/dashboard")
      } else {
        setStatus("success")
        setStatusIntent("info")
        setStatusMessage(
          "Check your inbox to confirm your email before signing in."
        )
      }
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
          <CardTitle className="text-2xl">Sign in to Audiograph</CardTitle>
          <CardDescription>
            Choose how you&rsquo;d like to access your Audiograph account.
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
          <div className="space-y-5">
            <div className="space-y-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={oauthLoading !== null || status === "loading"}
                onClick={() => {
                  void handleOAuthSignIn("google")
                }}
              >
                {oauthLoading === "google"
                  ? "Connecting to Google..."
                  : "Continue with Google"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={oauthLoading !== null || status === "loading"}
                onClick={() => {
                  void handleOAuthSignIn("spotify")
                }}
              >
                {oauthLoading === "spotify"
                  ? "Connecting to Spotify..."
                  : "Continue with Spotify"}
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <span className="h-px flex-1 bg-border" aria-hidden />
              <span className="text-xs uppercase text-muted-foreground">
                or use email
              </span>
              <span className="h-px flex-1 bg-border" aria-hidden />
            </div>
            <div className="rounded-lg bg-muted p-1 text-sm font-medium">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-2 transition",
                    authTab === "magic"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                  onClick={() => {
                    setAuthTab("magic")
                    setPasswordMode("sign-in")
                    setStatus("idle")
                    setStatusIntent(initialMessage?.intent ?? null)
                    setStatusMessage(initialMessage?.text ?? null)
                  }}
                >
                  Magic link
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-2 transition",
                    authTab === "password"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                  onClick={() => {
                    setAuthTab("password")
                    setStatus("idle")
                    setStatusIntent(null)
                    setStatusMessage(null)
                  }}
                >
                  Password
                </button>
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
              {authTab === "password" ? (
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={
                      passwordMode === "sign-in" ? "current-password" : "new-password"
                    }
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={status === "loading"}
                    required
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={status === "loading"}
                >
                  {status === "loading"
                    ? authTab === "magic"
                      ? "Sending email..."
                      : passwordMode === "sign-in"
                        ? "Signing in..."
                        : "Creating account..."
                    : authTab === "magic"
                      ? "Send magic link"
                      : passwordMode === "sign-in"
                        ? "Sign in with password"
                        : "Create account"}
                </Button>
                {authTab === "password" ? (
                  <p className="text-center text-sm text-muted-foreground">
                    {passwordMode === "sign-in"
                      ? "Need to create an account?"
                      : "Already have an account?"}{" "}
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={() => {
                        setPasswordMode((mode) =>
                          mode === "sign-in" ? "sign-up" : "sign-in"
                        )
                        setStatus("idle")
                        setStatusIntent(null)
                        setStatusMessage(null)
                      }}
                    >
                      {passwordMode === "sign-in" ? "Create one" : "Sign in"}
                    </button>
                  </p>
                ) : null}
                <Button variant="secondary" className="w-full" asChild>
                  <Link href="/" aria-label="Continue without logging in">
                    Continue without login
                  </Link>
                </Button>
              </div>
            </form>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Want to go back? {" "}
            <Link className="font-medium text-primary" href="/">
              Return to the dashboard
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

const SignInFallback = () => (
  <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4 py-12">
    <Card className="w-full max-w-md animate-pulse">
      <CardHeader>
        <CardTitle className="text-2xl">Loading sign in...</CardTitle>
        <CardDescription>
          Preparing the sign-in experience. Please wait a moment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-4 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  </div>
)

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  )
}
