import { forwardRef, type ComponentPropsWithoutRef } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

import type { TopTrackDatum } from "../top-tracks-table"

type TopTracksShareCardProps = Omit<
  ComponentPropsWithoutRef<typeof Card>,
  "children"
> & {
  data: TopTrackDatum[]
  timeframeLabel: string
}

const formatHours = (value: number) => `${value.toFixed(1)} hrs listened`

const TopTracksShareCard = forwardRef<HTMLDivElement, TopTracksShareCardProps>(
  function TopTracksShareCard({ data, timeframeLabel, className, ...props }, ref) {
    return (
      <Card
        ref={ref}
        className={cn(
          "w-full max-w-[520px] overflow-hidden border-border/80 bg-background/95 shadow-lg",
          className
        )}
        {...props}
      >
        <CardHeader className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Listening highlights
          </p>
          <CardTitle className="text-3xl font-bold">Top tracks</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            {timeframeLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length ? (
            <ol className="space-y-4">
              {data.map((item, index) => (
                <li
                  key={`${item.track}-${item.artist ?? "unknown"}-${index}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/80 px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold leading-tight">
                        {item.track}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {item.artist ?? "Unknown artist"}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {formatHours(item.hours)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-background/80">
              <p className="text-sm text-muted-foreground">
                No track insights available for this timeframe.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)

TopTracksShareCard.displayName = "TopTracksShareCard"

export { TopTracksShareCard }
