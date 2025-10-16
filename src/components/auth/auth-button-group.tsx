"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseClient"

type AuthStatus = "loading" | "signed-in" | "signed-out"

type AuthButtonGroupProps = {
  size?: "default" | "sm" | "lg"
  className?: string
  showEmail?: boolean
  orientation?: "horizontal" | "vertical"
}

export function AuthButtonGroup({
  size = "sm",
  className,
  showEmail = true,
  orientation = "vertical",
}: AuthButtonGroupProps) {
  const router = useRouter()
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [email, setEmail] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const supabase = useMemo<ReturnType<typeof createSupabaseClient> | null>(() => {
    if (typeof window === "undefined") {
      return null
    }

    if (!isSupabaseConfigured()) {
      console.error("Supabase environment variables are not configured.")
      return null
    }

    try {
      return createSupabaseClient()
    } catch (error) {
      console.error("Failed to initialize the Supabase client.", error)
      return null
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setStatus("signed-out")
      setEmail(null)
      setActionError("Supabase is not available in this environment.")
      return
    }

    let isMounted = true

    const syncUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (!isMounted) return
        if (error) {
          setStatus("signed-out")
          setEmail(null)
          setActionError(error.message)
          return
        }

        setStatus(data.user ? "signed-in" : "signed-out")
        setEmail(data.user?.email ?? null)
      } catch (error) {
        if (!isMounted) return
        const message =
          error instanceof Error ? error.message : "Unable to load account information."
        setStatus("signed-out")
        setEmail(null)
        setActionError(message)
      }
    }

    void syncUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      setStatus(session ? "signed-in" : "signed-out")
      setEmail(session?.user?.email ?? null)
      setActionError(null)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true)
    setActionError(null)
    if (!supabase) {
      setActionError("Supabase is not available in this environment.")
      setIsSigningOut(false)
      return
    }
    const { error } = await supabase.auth.signOut()
    if (error) {
      setActionError(error.message ?? "Unable to sign out.")
    } else {
      setStatus("signed-out")
      setEmail(null)
      router.push("/sign-in?message=signed-out")
    }
    setIsSigningOut(false)
  }, [router, supabase])

  const containerClass = cn("flex flex-col items-end gap-1", className)
  const rowClass =
    orientation === "horizontal"
      ? "flex flex-wrap items-center justify-end gap-3"
      : "flex items-center gap-3"

  if (status === "loading") {
    return (
      <div className={containerClass}>
        <div className={rowClass}>
          <Button size={size} variant="outline" disabled>
            Loading...
          </Button>
        </div>
      </div>
    )
  }

  if (status === "signed-out") {
    return (
      <div className={containerClass}>
        <div className={rowClass}>
          <Button asChild size={size} variant="outline">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
        {actionError ? (
          <span className="text-xs text-destructive">{actionError}</span>
        ) : null}
      </div>
    )
  }

  return (
    <div className={containerClass}>
      <div className={rowClass}>
        {showEmail && email ? (
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {email}
          </span>
        ) : null}
        <Button
          size={size}
          variant="outline"
          disabled={isSigningOut}
          onClick={() => {
            void handleSignOut()
          }}
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </Button>
      </div>
      {actionError ? (
        <span className="text-xs text-destructive">{actionError}</span>
      ) : null}
    </div>
  )
}
