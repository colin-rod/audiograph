"use client"

import { FormEvent, Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

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
  const messageParam = searchParams.get("message")
  const errorParam = searchParams.get("error")
  const initialMessage = useMemo(
    () => buildCallbackMessage(messageParam, errorParam),
    [messageParam, errorParam]
  )

  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(
    initialMessage?.text ?? null
  )
  const [statusIntent, setStatusIntent] = useState<"success" | "error" | "info" | null>(
    initialMessage?.intent ?? null
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setStatus("error")
      setStatusIntent("error")
      setStatusMessage("Please enter your email address.")
      return
    }

    setStatus("loading")
    setStatusIntent(null)
    setStatusMessage(null)

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
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in to Audiograph</CardTitle>
          <CardDescription>
            Enter your email address and we&rsquo;ll send you a sign-in link.
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
              <Button
                type="submit"
                className="w-full"
                disabled={status === "loading"}
              >
                {status === "loading" ? "Sending email..." : "Send magic link"}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                asChild
              >
                <Link href="/" aria-label="Continue without logging in">
                  Continue without login
                </Link>
              </Button>
            </div>
          </form>
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
