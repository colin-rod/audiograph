"use client";

import { useEffect, type ReactNode } from "react";

import {
  registerClientExceptionHandlers,
  unregisterClientExceptionHandlers,
} from "@/lib/monitoring/sentry/client";

interface Props {
  children: ReactNode;
}

export function SentryProvider({ children }: Props) {
  useEffect(() => {
    registerClientExceptionHandlers();

    return () => {
      unregisterClientExceptionHandlers();
    };
  }, []);

  return <>{children}</>;
}
