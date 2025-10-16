"use client";

import { Suspense, type ReactNode } from "react";

import { PostHogProvider } from "@/components/providers/posthog-provider";
import { SentryProvider } from "@/components/providers/sentry-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/providers/toaster";

interface Props {
  children: ReactNode;
}

export function AppProviders({ children }: Props) {
  return (
    <SentryProvider>
      <Suspense fallback={null}>
        <PostHogProvider>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </PostHogProvider>
      </Suspense>
    </SentryProvider>
  );
}
