import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

import { AuthButtonGroup } from "@/components/auth/auth-button-group";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/providers/toaster";
import { FeedbackButton } from "@/components/feedback/feedback-button";

export const metadata: Metadata = {
  title: "Audiograph — Turn Spotify history into visuals",
  description:
    "Upload your Spotify listening data in seconds and generate privacy-first insights powered by Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <header className="border-b bg-background">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
                <Link className="text-base font-semibold" href="/">
                  Audiograph
                </Link>
                <div className="flex items-center gap-6">
                  <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
                    <Link className="transition hover:text-primary" href="/upload">
                      Upload
                    </Link>
                  </nav>
                  <AuthButtonGroup />
                </div>
              </div>
            </header>
            <main className="flex-1">{children}</main>
            <FeedbackButton />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
