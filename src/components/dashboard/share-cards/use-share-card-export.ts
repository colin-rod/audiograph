"use client"

import { useCallback, useState } from "react"

type ExportFormat = "png" | "svg"

type ExportArgs = {
  node: HTMLElement | null
  filename: string
  format: ExportFormat
}

type ExportStatus = "idle" | "success" | "error"

type UseShareCardExportResult = {
  exportCard: (args: ExportArgs) => Promise<void>
  isExporting: boolean
  status: ExportStatus
  error: string | null
  lastFilename: string | null
  reset: () => void
}

type HtmlToImageModule = {
  toPng?: (node: HTMLElement, options?: unknown) => Promise<string>
  toSvg?: (node: HTMLElement, options?: unknown) => Promise<string>
  default?: {
    toPng?: (node: HTMLElement, options?: unknown) => Promise<string>
    toSvg?: (node: HTMLElement, options?: unknown) => Promise<string>
  }
}

const resolveHtmlToImageModule = async () => {
  const htmlToImageModule = (await import("html-to-image")) as HtmlToImageModule
  const toPngFn = htmlToImageModule.toPng ?? htmlToImageModule.default?.toPng
  const toSvgFn = htmlToImageModule.toSvg ?? htmlToImageModule.default?.toSvg

  if (!toPngFn || !toSvgFn) {
    throw new Error("html-to-image helpers are unavailable")
  }

  return { toPng: toPngFn, toSvg: toSvgFn }
}

const triggerDownload = (href: string, filename: string) => {
  const link = document.createElement("a")
  link.href = href
  link.download = filename
  link.rel = "noopener"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const normalizeFilename = (filename: string, extension: string) => {
  if (filename.toLowerCase().endsWith(`.${extension}`)) {
    return filename
  }
  return `${filename}.${extension}`
}

const EXPORT_ERROR_MESSAGE = "We couldn't export the card. Please try again."

const useShareCardExport = (): UseShareCardExportResult => {
  const [isExporting, setIsExporting] = useState(false)
  const [status, setStatus] = useState<ExportStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [lastFilename, setLastFilename] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStatus("idle")
    setError(null)
    setLastFilename(null)
  }, [])

  const exportCard = useCallback<UseShareCardExportResult["exportCard"]>(
    async ({ node, filename, format }) => {
      if (!node) {
        const missingNodeError = new Error("Card node is not available for export")
        setStatus("error")
        setError(missingNodeError.message)
        setLastFilename(null)
        return Promise.reject(missingNodeError)
      }

      setIsExporting(true)
      setStatus("idle")
      setError(null)

      try {
        const { toPng, toSvg } = await resolveHtmlToImageModule()

        if (format === "png") {
          const finalName = normalizeFilename(filename, "png")
          const dataUrl = await toPng(node, {
            cacheBust: true,
            pixelRatio: 2,
            quality: 0.95,
          })
          triggerDownload(dataUrl, finalName)
          setLastFilename(finalName)
        } else {
          const finalName = normalizeFilename(filename, "svg")
          const svgMarkup = await toSvg(node, { cacheBust: true })
          const blob = new Blob([svgMarkup], {
            type: "image/svg+xml;charset=utf-8",
          })
          const objectUrl = URL.createObjectURL(blob)
          try {
            triggerDownload(objectUrl, finalName)
          } finally {
            URL.revokeObjectURL(objectUrl)
          }
          setLastFilename(finalName)
        }

        setStatus("success")
      } catch (caughtError) {
        console.error(caughtError)
        setStatus("error")
        setLastFilename(null)
        setError(
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : EXPORT_ERROR_MESSAGE
        )
      } finally {
        setIsExporting(false)
      }
    },
    []
  )

  return { exportCard, isExporting, status, error, lastFilename, reset }
}

export { useShareCardExport }
