"use client"

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

export type TopTrackDatum = {
  track: string
  artist: string | null
  hours: number
}

type TopTracksTableProps = {
  data: TopTrackDatum[]
}

const formatHours = (value: number) => `${value.toFixed(1)} hrs`

function TopTracksTable({ data }: TopTracksTableProps) {
  if (!data.length) {
    return (
      <Card aria-labelledby="top-tracks-heading" className="shadow-none">
        <CardHeader>
          <CardTitle id="top-tracks-heading" role="heading" aria-level={3}>
            Top tracks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No track listening data available yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card aria-labelledby="top-tracks-heading" className="shadow-none">
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

function TopTracksTableSkeleton() {
  return (
    <Card aria-busy data-testid="top-tracks-table-skeleton" className="shadow-none">
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
