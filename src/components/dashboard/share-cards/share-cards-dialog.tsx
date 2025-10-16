"use client"

import { useEffect, useId, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { TopArtistDatum } from "../top-artists-chart"
import type { TopTrackDatum } from "../top-tracks-table"
import { TopArtistsShareCard } from "./top-artists-share-card"
import { TopTracksShareCard } from "./top-tracks-share-card"
import { useShareCardExport } from "./use-share-card-export"

type ShareCardsDialogProps = {
  open: boolean
  onClose: () => void
  timeframeLabel: string
  activeTimeframeKey: string
  topArtists: TopArtistDatum[]
  topTracks: TopTrackDatum[]
}

const ShareCardsDialog = ({
  open,
  onClose,
  timeframeLabel,
  activeTimeframeKey,
  topArtists,
  topTracks,
}: ShareCardsDialogProps) => {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const previousFocusRef = useRef<Element | null>(null)
  const artistsCardRef = useRef<HTMLDivElement | null>(null)
  const tracksCardRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const {
    exportCard,
    isExporting,
    status,
    error,
    lastFilename,
    reset,
  } = useShareCardExport()

  useEffect(() => {
    if (!open) {
      return
    }

    previousFocusRef.current = document.activeElement

    const frame = requestAnimationFrame(() => {
      closeButtonRef.current?.focus()
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== "Tab") {
        return
      }

      const dialogNode = dialogRef.current
      if (!dialogNode) {
        return
      }

      const focusable = dialogNode.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      )

      if (focusable.length === 0) {
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener("keydown", handleKeyDown)
      if (
        previousFocusRef.current &&
        previousFocusRef.current instanceof HTMLElement &&
        document.contains(previousFocusRef.current)
      ) {
        previousFocusRef.current.focus()
      }
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return
      }

      if (!dialogRef.current) {
        return
      }

      if (dialogRef.current.contains(event.target)) {
        return
      }

      onClose()
    }

    document.addEventListener("mousedown", handlePointerDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const successMessage = useMemo(() => {
    if (status !== "success" || !lastFilename) {
      return null
    }
    return `Downloaded ${lastFilename}.`
  }, [status, lastFilename])

  if (!open) {
    return null
  }

  const handleDownloadArtists = (format: "png" | "svg") =>
    exportCard({
      node: artistsCardRef.current,
      filename: `audiograph-top-artists-${activeTimeframeKey}`,
      format,
    })

  const handleDownloadTracks = (format: "png" | "svg") =>
    exportCard({
      node: tracksCardRef.current,
      filename: `audiograph-top-tracks-${activeTimeframeKey}`,
      format,
    })

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn(
          "relative z-10 w-full max-w-5xl rounded-2xl border bg-background p-6 shadow-xl",
          "max-h-[90vh] overflow-y-auto"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 id={titleId} className="text-2xl font-semibold">
              Share your top insights
            </h2>
            <p id={descriptionId} className="text-sm text-muted-foreground">
              Download image cards featuring your top artists and tracks for
              {" "}
              {timeframeLabel.toLowerCase()}.
            </p>
          </div>
          <Button
            ref={closeButtonRef}
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close share cards dialog"
          >
            <X aria-hidden className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <TopArtistsShareCard
              ref={artistsCardRef}
              data={topArtists}
              timeframeLabel={timeframeLabel}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => handleDownloadArtists("png")}
                disabled={isExporting}
              >
                Download artists PNG
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDownloadArtists("svg")}
                disabled={isExporting}
              >
                Download artists SVG
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <TopTracksShareCard
              ref={tracksCardRef}
              data={topTracks}
              timeframeLabel={timeframeLabel}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => handleDownloadTracks("png")}
                disabled={isExporting}
              >
                Download tracks PNG
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDownloadTracks("svg")}
                disabled={isExporting}
              >
                Download tracks SVG
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-6 min-h-[24px]">
          {status === "error" && error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {successMessage ? (
            <p className="text-sm text-muted-foreground">{successMessage}</p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  )
}

export { ShareCardsDialog }
