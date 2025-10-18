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
import type { ShareCardTheme } from "./share-card-theme"

type TopTracksShareCardProps = Omit<
  ComponentPropsWithoutRef<typeof Card>,
  "children"
> & {
  data: TopTrackDatum[]
  timeframeLabel: string
  theme: ShareCardTheme
}

const formatHours = (value: number) => `${value.toFixed(1)} hrs listened`

const TopTracksShareCard = forwardRef<HTMLDivElement, TopTracksShareCardProps>(
  function TopTracksShareCard(
    { data, timeframeLabel, className, theme, ...props },
    ref
  ) {
    const themeClasses = {
      light: {
        card: "share-card share-card--light border-slate-200 bg-white text-slate-900",
        accent: "text-slate-500",
        listItem: "border-slate-200 bg-slate-50",
        listNumber: "text-slate-400",
        muted: "text-slate-500",
        emptyState: "border-slate-200 bg-white/70",
      },
      dark: {
        card: "share-card share-card--dark border-slate-700 bg-slate-900 text-slate-100",
        accent: "text-slate-400",
        listItem: "border-slate-700 bg-slate-800/80",
        listNumber: "text-slate-500",
        muted: "text-slate-400",
        emptyState: "border-slate-700 bg-slate-900/80",
      },
    } satisfies Record<ShareCardTheme, Record<string, string>>

    const palette = themeClasses[theme]

    return (
      <Card
        ref={ref}
        className={cn(
          "w-full max-w-[520px] overflow-hidden shadow-lg",
          palette.card,
          className
        )}
        {...props}
      >
        <CardHeader className="space-y-3">
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.3em]",
              palette.accent
            )}
          >
            Listening highlights
          </p>
          <CardTitle className="text-3xl font-bold">Top tracks</CardTitle>
          <CardDescription className={cn("text-base", palette.muted)}>
            {timeframeLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length ? (
            <ol className="space-y-4">
              {data.map((item, index) => (
                <li
                  key={`${item.track}-${item.artist ?? "unknown"}-${index}`}
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-lg border px-4 py-3",
                    palette.listItem
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        "text-2xl font-semibold",
                        palette.listNumber
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold leading-tight">
                        {item.track}
                      </span>
                      <span className={cn("text-sm", palette.muted)}>
                        {item.artist ?? "Unknown artist"}
                      </span>
                    </div>
                  </div>
                  <span className={cn("text-sm font-medium", palette.muted)}>
                    {formatHours(item.hours)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div
              className={cn(
                "flex min-h-[200px] items-center justify-center rounded-lg border border-dashed",
                palette.emptyState
              )}
            >
              <p className={cn("text-sm", palette.muted)}>
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
