import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LandingPage() {
  return (
    <div className="relative isolate overflow-hidden bg-[#05060b] text-slate-50">
      <section className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.22),transparent_50%)]" />
          <div className="absolute inset-y-0 right-0 hidden w-1/2 translate-x-1/4 items-center justify-center lg:flex">
            <div className="relative h-[420px] w-[420px] rounded-[48px] bg-zinc-900/40 backdrop-blur">
              <div className="absolute inset-6 grid grid-cols-3 gap-3">
                {["from-emerald-500/70 to-cyan-500/50", "from-blue-500/70 to-emerald-400/60", "from-purple-500/70 to-pink-500/60", "from-orange-500/70 to-amber-400/60", "from-emerald-500/70 to-lime-400/60", "from-sky-500/70 to-indigo-500/60", "from-rose-500/70 to-orange-500/60", "from-teal-500/70 to-cyan-400/60", "from-fuchsia-500/70 to-sky-500/60"].map((gradient, index) => (
                  <div
                    key={gradient}
                    aria-hidden
                    className={`rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} shadow-[0_20px_40px_-20px_rgba(0,0,0,0.7)]`}
                    style={{
                      animationDelay: `${index * 80}ms`,
                    }}
                    data-animate="float"
                  />
                ))}
              </div>
              <div className="absolute inset-x-12 bottom-12 h-16 rounded-full border border-white/10 bg-zinc-950/70 px-6">
                <svg
                  aria-hidden
                  viewBox="0 0 260 64"
                  className="h-full w-full text-emerald-400/70"
                >
                  <path
                    d="M2 32c9 0 9-18 18-18s9 36 18 36 9-36 18-36 9 36 18 36 9-36 18-36 9 36 18 36 9-36 18-36 9 36 18 36 9-36 18-36 9 36 18 36 9-36 18-36 9 36 18 36 9-36 18-36 9 36 18 36"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col gap-14 px-6 pb-24 pt-28 lg:flex-row lg:items-center lg:gap-20">
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-5 py-1.5 text-sm font-medium text-emerald-300">
              Private listening analytics for Spotify fans
              <span className="size-1.5 rounded-full bg-emerald-400/70" aria-hidden />
              <span className="text-emerald-200/80">Instant insights</span>
            </div>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Turn your Spotify history into a cinematic story worth sharing.
            </h1>
            <p className="text-lg text-slate-300 sm:text-xl">
              Audiograph transforms the JSON export from your Spotify account into rich visualizations—no spreadsheets, scripts, or data wrangling required.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button
                asChild
                size="lg"
                className="w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-400 text-slate-950 shadow-[0_20px_40px_-20px_rgba(16,185,129,0.6)] transition hover:from-emerald-300 hover:via-emerald-400 hover:to-cyan-300 sm:w-auto"
              >
                <Link href="/upload">Upload your history</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full border-emerald-400/30 bg-transparent text-emerald-200 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.25)] transition hover:border-emerald-300/40 hover:bg-emerald-400/10 hover:text-emerald-100 sm:w-auto"
              >
                <Link href="#privacy">Learn about privacy</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 pt-12">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[2fr,1.1fr]">
          <Card className="bg-zinc-900/70 border-white/10 shadow-[0_25px_60px_-30px_rgba(0,0,0,0.8)]">
            <CardHeader className="border-b border-white/5 pb-8">
              <CardTitle className="text-xl font-semibold text-slate-50">Upload in seconds</CardTitle>
              <CardDescription className="text-slate-300">
                Drop in your Spotify JSON export and Audiograph handles the rest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-8 text-slate-300">
              <p>
                We parse, dedupe, and batch upload your listening history to your connected Supabase project so dashboards stay up to date.
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-400 text-slate-950 hover:from-emerald-300 hover:via-emerald-400 hover:to-cyan-300"
              >
                <Link href="/upload">Go to upload</Link>
              </Button>
            </CardContent>
          </Card>

          <Card
            id="privacy"
            className="bg-zinc-900/60 border-white/10 shadow-[0_20px_40px_-25px_rgba(0,0,0,0.8)] backdrop-blur"
          >
            <CardHeader className="border-b border-white/5 pb-7">
              <CardTitle className="text-xl font-semibold text-slate-50">Your privacy stays center stage</CardTitle>
              <CardDescription className="text-slate-300">
                You are always in control of your listening data.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-7">
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-emerald-400/70" aria-hidden />
                  <span>Uploads happen client-side and go straight to your Supabase tables.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-emerald-400/70" aria-hidden />
                  <span>No Spotify credentials are stored or shared with Audiograph.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-emerald-400/70" aria-hidden />
                  <span>Easily wipe imported listens at any time from the upload page.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-6 pb-28">
        <div className="mx-auto flex max-w-5xl flex-col gap-12 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
              See your listening habits come alive
            </h2>
            <p className="text-base text-slate-300 sm:text-lg">
              From most-played artists to late-night listening binges, Audiograph helps you explore trends that would otherwise stay buried in raw data.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Customizable dashboards", "Shareable highlights", "Secure by design"].map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <figure className="flex-1">
            <Card className="overflow-hidden bg-zinc-900/70 border-white/10 shadow-[0_25px_50px_-30px_rgba(0,0,0,0.9)]">
              <CardContent className="space-y-6 p-8">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                  <span>Global Sessions</span>
                  <span>Live Pulse</span>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-3">
                    {[24, 36, 18, 42, 30, 44, 20, 38].map((height, index) => (
                      <div key={index} className="flex flex-col justify-end gap-2 text-right text-[10px] uppercase tracking-widest text-slate-500">
                        <div className="h-24 w-full rounded-full bg-gradient-to-t from-emerald-400/10 via-emerald-400/60 to-cyan-400/70">
                          <div
                            className="w-full rounded-full bg-gradient-to-t from-emerald-500/80 to-cyan-400/70"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <span>{index % 2 === 0 ? "AM" : "PM"}</span>
                      </div>
                    ))}
                  </div>
                  <figcaption className="text-sm text-slate-300">
                    Upload once and generate visuals you&apos;ll be excited to share with friends or keep for your own record keeping.
                  </figcaption>
                </div>
              </CardContent>
            </Card>
          </figure>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
