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
