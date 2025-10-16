import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AuthButtonGroup } from "@/components/auth/auth-button-group";
import { AppProviders } from "@/components/providers/app-providers";
import { FeedbackButton } from "@/components/feedback/feedback-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body>
        <AppProviders>
          <div
            className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
          >
            <header
              className="border-b border-white/10 bg-[#121212] text-white [--accent:#1fdf64] [--accent-foreground:#121212] [--background:rgba(24,24,24,1)] [--border:rgba(255,255,255,0.1)] [--foreground:rgba(249,249,249,1)] [--input:rgba(36,36,36,1)] [--muted-foreground:rgba(255,255,255,0.68)] [--ring:rgba(83,250,164,0.5)]"
            >
              <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 md:flex-nowrap md:gap-8 md:py-5">
                <Link
                  className="group flex items-center gap-3 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  href="/"
                >
                  <span className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-[#1fdf64] via-[#1db954] to-[#15883e] text-[#0f291a] shadow-lg transition-transform duration-200 group-hover:scale-105">
                    <svg
                      aria-hidden="true"
                      className="size-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4.5 12.75c3.25-2.25 7.75-2.25 11 0m-9.5-5c4-3 9.5-3 13.5 0m-10.5 10c2.5-1.75 6-1.75 8.5 0"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                    <span className="sr-only">Audiograph logo</span>
                  </span>
                  <span className="text-lg font-semibold tracking-tight md:text-xl">
                    Audiograph
                  </span>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
            >
              Skip to content
            </a>
            <header className="border-b bg-background">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
                <Link className="text-base font-semibold" href="/">
                  Audiograph
                </Link>
                <div className="flex flex-1 flex-wrap items-center justify-end gap-3 md:gap-6">
                  <nav
                    aria-label="Primary"
                    className="flex items-center gap-2 text-sm font-medium md:gap-4"
                  >
                    <Link
                      className="rounded-full px-3 py-2 text-white/70 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white hover:bg-white/10 hover:text-white active:bg-white/20"
                      href="/upload"
                    >
                      Upload
                    </Link>
                  </nav>
                  <AuthButtonGroup
                    className="text-white"
                    orientation="horizontal"
                  />
                </div>
              </div>
            </header>
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <FeedbackButton />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
