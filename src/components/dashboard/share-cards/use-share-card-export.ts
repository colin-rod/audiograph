"use client"

import { useCallback, useMemo, useState } from "react"

type ExportFormat = "png" | "svg" | "clipboard" | "share"

type ExportArgs = {
  node: HTMLElement | null
  filename: string
  format: ExportFormat
  shareText?: string
  shareTitle?: string
  contextLabel?: string
}

type ExportStatus = "idle" | "success" | "error"

type UseShareCardExportResult = {
  exportCard: (args: ExportArgs) => Promise<void>
  isExporting: boolean
  status: ExportStatus
  error: string | null
  lastFilename: string | null
  lastExportFormat: ExportFormat | null
  lastContextLabel: string | null
  canCopyToClipboard: boolean
  canShare: boolean
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
const CLIPBOARD_UNSUPPORTED_MESSAGE =
  "Copying to the clipboard is not supported in this browser."
const SHARE_UNSUPPORTED_MESSAGE =
  "Sharing cards is not supported in this browser."

const useShareCardExport = (): UseShareCardExportResult => {
  const [isExporting, setIsExporting] = useState(false)
  const [status, setStatus] = useState<ExportStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [lastFilename, setLastFilename] = useState<string | null>(null)
  const [lastExportFormat, setLastExportFormat] =
    useState<ExportFormat | null>(null)
  const [lastContextLabel, setLastContextLabel] = useState<string | null>(null)

  const canCopyToClipboard = useMemo(() => {
    if (typeof navigator === "undefined") {
      return false
    }

    const clipboard = navigator.clipboard

    if (!clipboard || typeof clipboard.write !== "function") {
      return false
    }

    return typeof ClipboardItem !== "undefined"
  }, [])

  const canShare = useMemo(() => {
    if (typeof navigator === "undefined") {
      return false
    }

    if (typeof File === "undefined") {
      return false
    }

    const nav = navigator as Navigator & {
      share?: Navigator["share"]
      canShare?: Navigator["canShare"]
    }

    if (typeof nav.share !== "function") {
      return false
    }

    if (typeof nav.canShare !== "function") {
      return true
    }

    try {
      const probeFile = new File([""], "probe.png", { type: "image/png" })
      return nav.canShare({ files: [probeFile] })
    } catch {
      return false
    }
  }, [])

  const reset = useCallback(() => {
    setStatus("idle")
    setError(null)
    setLastFilename(null)
    setLastExportFormat(null)
    setLastContextLabel(null)
  }, [])

  const exportCard = useCallback<UseShareCardExportResult["exportCard"]>(
    async ({ node, filename, format, shareText, shareTitle, contextLabel }) => {
      if (!node) {
        const missingNodeError = new Error("Card node is not available for export")
        setStatus("error")
        setError(missingNodeError.message)
        setLastFilename(null)
        setLastExportFormat(null)
        setLastContextLabel(null)
        return Promise.reject(missingNodeError)
      }

      if (format === "clipboard" && !canCopyToClipboard) {
        const unsupportedClipboardError = new Error(
          CLIPBOARD_UNSUPPORTED_MESSAGE
        )
        setStatus("error")
        setError(unsupportedClipboardError.message)
        setLastFilename(null)
        setLastExportFormat(null)
        setLastContextLabel(null)
        return Promise.reject(unsupportedClipboardError)
      }

      if (format === "share" && !canShare) {
        const unsupportedShareError = new Error(SHARE_UNSUPPORTED_MESSAGE)
        setStatus("error")
        setError(unsupportedShareError.message)
        setLastFilename(null)
        setLastExportFormat(null)
        setLastContextLabel(null)
        return Promise.reject(unsupportedShareError)
      }

      setIsExporting(true)
      setStatus("idle")
      setError(null)
      setLastExportFormat(null)
      setLastContextLabel(null)

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
          setLastExportFormat("png")
          setLastContextLabel(contextLabel ?? null)
        } else if (format === "svg") {
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
          setLastExportFormat("svg")
          setLastContextLabel(contextLabel ?? null)
        } else if (format === "share") {
          if (typeof navigator === "undefined") {
            throw new Error(SHARE_UNSUPPORTED_MESSAGE)
          }

          const finalName = normalizeFilename(filename, "png")
          const dataUrl = await toPng(node, {
            cacheBust: true,
            pixelRatio: 2,
            quality: 0.95,
          })
          const response = await fetch(dataUrl)
          const blob = await response.blob()
          let file: File

          try {
            file = new File([blob], finalName, { type: "image/png" })
          } catch (caughtError) {
            throw new Error(SHARE_UNSUPPORTED_MESSAGE)
          }

          const nav = navigator as Navigator & {
            share: (data: ShareData) => Promise<void>
            canShare?: (data: ShareData) => boolean
          }

          const shareData: ShareData = {
            files: [file],
            ...(shareText ? { text: shareText } : {}),
            ...(shareTitle ? { title: shareTitle } : {}),
          }

          if (typeof nav.canShare === "function" && !nav.canShare(shareData)) {
            throw new Error(SHARE_UNSUPPORTED_MESSAGE)
          }

          await nav.share(shareData)
          setLastFilename(finalName)
          setLastExportFormat("share")
          setLastContextLabel(contextLabel ?? null)
        } else {
          const dataUrl = await toPng(node, {
            cacheBust: true,
            pixelRatio: 2,
            quality: 0.95,
          })
          const response = await fetch(dataUrl)
          const blob = await response.blob()
          const clipboardItem = new ClipboardItem({
            "image/png": blob,
          })
          await navigator.clipboard.write([clipboardItem])
          setLastFilename(filename)
          setLastExportFormat("clipboard")
          setLastContextLabel(contextLabel ?? null)
        }

        setStatus("success")
      } catch (error) {
        console.error(error)
        setStatus("error")
        setLastFilename(null)
        setLastExportFormat(null)
        setLastContextLabel(null)
        setError(
          error instanceof Error && error.message
            ? error.message
            : EXPORT_ERROR_MESSAGE
        )
      } finally {
        setIsExporting(false)
      }
    },
    [canCopyToClipboard, canShare]
  )

  return {
    exportCard,
    isExporting,
    status,
    error,
    lastFilename,
    lastExportFormat,
    lastContextLabel,
    canCopyToClipboard,
    canShare,
    reset,
  }
}

export { useShareCardExport }
