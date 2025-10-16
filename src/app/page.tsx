import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LandingPage() {
  return (
    <div className="space-y-24 pb-24">
      <section className="bg-gradient-to-b from-background via-background to-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-24 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
              Private listening analytics for Spotify fans
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Turn your Spotify history into beautiful, shareable insights.
            </h1>
            <p className="text-lg text-muted-foreground">
              Audiograph transforms the JSON export from your Spotify account into rich
              visualizations—no spreadsheets, scripts, or data wrangling required.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/upload">Upload your history</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href="#privacy">Learn about privacy</Link>
              </Button>
            </div>
          </div>
          <figure className="flex-1">
            <Card className="mx-auto max-w-xl">
              <CardContent className="p-0">
                <Image
                  src="/window.svg"
                  alt="Audiograph preview with charts generated from listening history"
                  width={960}
                  height={720}
                  className="h-auto w-full"
                  priority
                />
              </CardContent>
            </Card>
          </figure>
        </div>
      </section>

      <section className="px-4">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[2fr,1fr]">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Upload in seconds</CardTitle>
              <CardDescription>
                Drop in your Spotify JSON export and Audiograph handles the rest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We parse, dedupe, and batch upload your listening history to your connected
                Supabase project so dashboards stay up to date.
              </p>
              <Button asChild>
                <Link href="/upload">Go to upload</Link>
              </Button>
            </CardContent>
          </Card>

          <Card id="privacy" className="shadow-sm">
            <CardHeader>
              <CardTitle>Your privacy stays center stage</CardTitle>
              <CardDescription>
                You are always in control of your listening data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Uploads happen client-side and go straight to your Supabase tables.</li>
                <li>No Spotify credentials are stored or shared with Audiograph.</li>
                <li>Easily wipe imported listens at any time from the upload page.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight">See your listening habits come alive</h2>
            <p className="text-muted-foreground">
              From most-played artists to late-night listening binges, Audiograph helps you
              explore trends that would otherwise stay buried in raw data.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Customizable dashboards
              </span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Shareable highlights
              </span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Secure by design
              </span>
            </div>
          </div>
          <figure className="flex-1">
            <Card className="overflow-hidden shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Image
                    src="/globe.svg"
                    alt="Listening timeline preview"
                    width={640}
                    height={480}
                    className="h-auto w-full"
                  />
                  <figcaption className="text-sm text-muted-foreground">
                    Upload once and generate visuals you&apos;ll be excited to share with friends or keep for
                    your own record keeping.
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
