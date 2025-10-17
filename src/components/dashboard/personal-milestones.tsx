import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
})

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

type TrackHighlight = {
  track: string
  artist: string | null
  hours: number
}

type ArtistHighlight = {
  artist: string
  hours: number
}

type TopDayHighlight = {
  date: string
  label: string
  totalHours: number
  trackHighlights: TrackHighlight[]
  artistHighlights: ArtistHighlight[]
}

type AnniversaryCallout = {
  firstListenDate: string
  firstListenLabel: string
  upcomingAnniversaryDate: string
  upcomingAnniversaryLabel: string
  anniversaryNumber: number
  daysUntil: number
}

type ListeningDiversityScore = {
  score: number
  tierLabel: string
  summary: string
  uniqueArtists: number
  uniqueTracks: number
  totalHours: number
}

type PersonalMilestonesProps = {
  className?: string
  topDayHighlight: TopDayHighlight | null
  anniversary: AnniversaryCallout | null
  diversityScore: ListeningDiversityScore | null
}

const formatHours = (value: number) => {
  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
  const unit = rounded === "1" ? "hour" : "hours"
  return `${rounded} ${unit}`
}

const formatTrackHighlight = (highlight: TrackHighlight) => {
  if (!highlight.artist) {
    return highlight.track
  }

  return `${highlight.track} — ${highlight.artist}`
}

const formatAnniversaryLabel = (anniversaryNumber: number) => {
  const suffixLookup: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" }
  const suffix = suffixLookup[anniversaryNumber % 10] ?? "th"

  if (anniversaryNumber % 100 >= 11 && anniversaryNumber % 100 <= 13) {
    return `${anniversaryNumber}th`
  }

  return `${anniversaryNumber}${suffix}`
}

const formatDaysUntil = (daysUntil: number) => {
  if (daysUntil <= 0) {
    return "today"
  }

  if (daysUntil === 1) {
    return "in 1 day"
  }

  if (daysUntil < 30) {
    return `in ${daysUntil} days`
  }

  return `${Math.round(daysUntil / 7)} weeks away`
}

function PersonalMilestones({
  className,
  topDayHighlight,
  anniversary,
  diversityScore,
}: PersonalMilestonesProps) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-3", className)}>
      <Card className="relative overflow-hidden">
        <CardHeader>
          <CardTitle>Top day highlight</CardTitle>
          <CardDescription>
            {topDayHighlight
              ? `Your longest listening stretch on ${topDayHighlight.label}`
              : "We’ll surface your standout day once we have more plays."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-6 pb-6">
          {topDayHighlight ? (
            <>
              <div className="rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
                <p className="text-sm uppercase tracking-wide text-primary">
                  {DATE_FORMATTER.format(new Date(topDayHighlight.date))}
                </p>
                <p className="mt-1 text-3xl font-semibold">
                  {formatHours(topDayHighlight.totalHours)} tuned in
                </p>
                <p className="text-muted-foreground mt-2">
                  A day drenched in music. Here’s what dominated your speakers.
                </p>
              </div>
              <div className="grid gap-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Soundtrack moments
                  </h3>
                  {topDayHighlight.trackHighlights.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm">
                      {topDayHighlight.trackHighlights.map((highlight) => (
                        <li key={`${highlight.track}-${highlight.artist ?? "unknown"}`}>
                          <span className="font-medium">
                            {formatTrackHighlight(highlight)}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            ({highlight.hours.toFixed(1)} hrs)
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      We’ll spotlight the tracks that owned your best day once we
                      have more to go on.
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Spotlight artists
                  </h3>
                  {topDayHighlight.artistHighlights.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                      {topDayHighlight.artistHighlights.map((highlight) => (
                        <li
                          key={highlight.artist}
                          className="rounded-full bg-muted px-3 py-1"
                        >
                          <span className="font-medium">{highlight.artist}</span>
                          <span className="text-muted-foreground"> · {highlight.hours.toFixed(1)} hrs</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Once an artist takes over your day, we’ll celebrate them
                      here.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Keep listening and we’ll capture the day your speakers never took
              a break.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Anniversary callout</CardTitle>
          <CardDescription>
            {anniversary
              ? `First tracked play on ${anniversary.firstListenLabel}`
              : "Your anniversary countdown starts once we see your first play."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4 pb-6">
          {anniversary ? (
            <>
              <div className="rounded-lg border border-dashed p-4">
                <p className="text-sm text-muted-foreground">Next up</p>
                <p className="text-2xl font-semibold">
                  {formatAnniversaryLabel(anniversary.anniversaryNumber)} anniversary
                </p>
                <p className="text-muted-foreground">
                  {SHORT_DATE_FORMATTER.format(
                    new Date(anniversary.upcomingAnniversaryDate)
                  )}{" "}
                  ({formatDaysUntil(anniversary.daysUntil)})
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Celebrate the journey from that first spin on {anniversary.firstListenLabel}.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              As soon as we log your very first listen, we’ll start a countdown
              to its anniversary.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Listening diversity score</CardTitle>
          <CardDescription>
            {diversityScore
              ? "A quick pulse on how wide you roam across artists and tracks."
              : "We’ll generate your variety score once there’s enough history."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4 pb-6">
          {diversityScore ? (
            <>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-semibold tracking-tight">
                  {diversityScore.score}
                </span>
                <span className="text-muted-foreground text-sm uppercase tracking-wide">
                  {diversityScore.tierLabel}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {diversityScore.summary}
              </p>
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-muted/60 p-3 text-center">
                  <dt className="text-muted-foreground">Artists</dt>
                  <dd className="text-lg font-semibold">
                    {diversityScore.uniqueArtists}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted/60 p-3 text-center">
                  <dt className="text-muted-foreground">Tracks</dt>
                  <dd className="text-lg font-semibold">
                    {diversityScore.uniqueTracks}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted/60 p-3 text-center">
                  <dt className="text-muted-foreground">Hours</dt>
                  <dd className="text-lg font-semibold">
                    {diversityScore.totalHours.toFixed(1)}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Listen across more artists and tracks to reveal how adventurous
              your sessions are.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PersonalMilestonesSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-3", className)}>
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 pb-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-6 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export {
  PersonalMilestones,
  PersonalMilestonesSkeleton,
}
export type {
  AnniversaryCallout,
  ArtistHighlight,
  ListeningDiversityScore,
  TopDayHighlight,
  TrackHighlight,
}
