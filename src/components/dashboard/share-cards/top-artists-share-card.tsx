import { forwardRef, type ComponentPropsWithoutRef } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

import type { TopArtistDatum } from "../top-artists-chart"

type TopArtistsShareCardProps = Omit<
  ComponentPropsWithoutRef<typeof Card>,
  "children"
> & {
  data: TopArtistDatum[]
  timeframeLabel: string
}

const formatHours = (value: number) => `${value.toFixed(1)} hrs listened`

const TopArtistsShareCard = forwardRef<HTMLDivElement, TopArtistsShareCardProps>(
  function TopArtistsShareCard(
    { data, timeframeLabel, className, ...props },
    ref
  ) {
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
          <CardTitle className="text-3xl font-bold">Top artists</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            {timeframeLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length ? (
            <ol className="space-y-4">
              {data.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/80 px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold leading-tight">
                        {item.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatHours(item.hours)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-background/80">
              <p className="text-sm text-muted-foreground">
                No artist insights available for this timeframe.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)

TopArtistsShareCard.displayName = "TopArtistsShareCard"

export { TopArtistsShareCard }
