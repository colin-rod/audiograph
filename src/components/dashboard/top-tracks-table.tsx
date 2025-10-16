"use client"

import { Music2 } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type TopTrackDatum = {
  track: string
  artist: string | null
  hours: number
}

type TopTracksTableProps = {
  data: TopTrackDatum[]
  className?: string
}

const formatHours = (value: number) => `${value.toFixed(1)} hrs`

function TopTracksTable({ data, className }: TopTracksTableProps) {
  if (!data.length) {
    return (
      <Card
        aria-labelledby="top-tracks-heading"
        className={cn("shadow-none", className)}
      >
        <CardHeader>
          <CardTitle id="top-tracks-heading" role="heading" aria-level={3}>
            Top tracks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Your soundtrack is waiting"
            description="Listen to a few tracks and we will showcase your go-to songs and artists."
            icon={<Music2 aria-hidden className="h-6 w-6" />}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      aria-labelledby="top-tracks-heading"
      className={cn("shadow-none", className)}
    >
      <CardHeader className="space-y-1">
        <CardTitle id="top-tracks-heading" role="heading" aria-level={3}>
          Top tracks
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your most played songs and their artists.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>Ordered by total listening hours.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Track</TableHead>
              <TableHead scope="col">Artist</TableHead>
              <TableHead scope="col" className="text-right">
                Hours listened
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={`${item.track}-${item.artist ?? "unknown"}`}>
                <TableCell>{item.track}</TableCell>
                <TableCell>{item.artist ?? "—"}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatHours(item.hours)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function TopTracksTableSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-busy
      data-testid="top-tracks-table-skeleton"
      className={cn("shadow-none", className)}
    >
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}

export { TopTracksTable, TopTracksTableSkeleton }
