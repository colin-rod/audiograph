'use client'

import React, { useState, useRef, useEffect, useId, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Bug, Sparkles, Palette, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

import { capturePostHogEvent } from '@/lib/monitoring/posthog/client'
import { Button } from '@/components/ui/button'
import { getSupabaseConfigOrWarn } from '@/lib/supabase/config'
import {
  FeedbackType,
  feedbackFormSchema,
  type FeedbackFormData,
  type FeedbackResponse,
} from '@/lib/types/feedback'
import { cn } from '@/lib/utils'

const SUPABASE_CONFIG_ERROR_MESSAGE =
  'Supabase environment variables are not configured. Feedback submissions are currently unavailable. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'

type FocusTargetRef = { current: HTMLElement | null } | null

interface FeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef?: FocusTargetRef
}

// Feedback type options with icons
const FEEDBACK_TYPE_OPTIONS = [
  { value: FeedbackType.BUG, label: 'Bug Report', icon: Bug },
  { value: FeedbackType.FEATURE_REQUEST, label: 'Feature Request', icon: Sparkles },
  { value: FeedbackType.UX_ISSUE, label: 'UX Issue', icon: Palette },
  { value: FeedbackType.OTHER, label: 'General Feedback', icon: MessageSquare },
] as const

export function FeedbackModal({ open, onOpenChange, triggerRef }: FeedbackModalProps) {
  const [formData, setFormData] = useState<FeedbackFormData>({
    type: FeedbackType.OTHER,
    description: '',
    screenshots: [],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
  const supabaseConfigError = isSupabaseConfigured ? null : SUPABASE_CONFIG_ERROR_MESSAGE

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  /**
   * Get current user email if authenticated
   */
  const getUserEmail = async (): Promise<string | undefined> => {
    if (!isSupabaseConfigured) {
      console.error(SUPABASE_CONFIG_ERROR_MESSAGE)
      return undefined
    }
    try {
      // For client-side, we need to use the browser client
      const config = getSupabaseConfigOrWarn('feedback-modal')

      if (!config) {
        return undefined
      }

      const { createBrowserClient } = await import('@supabase/ssr')
      const supabase = createBrowserClient(config.url, config.anonKey)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      return user?.email
    } catch {
      // Anonymous submission - no error needed
      return undefined
    }
  }

  /**
   * Handle screenshot paste
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          files.push(file)
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault()
      addScreenshots(files)
    }
  }

  /**
   * Add screenshots to form data
   */
  const addScreenshots = (files: File[]) => {
    const currentScreenshots = formData.screenshots || []
    const newScreenshots = [...currentScreenshots, ...files]

    // Limit to 5 screenshots
    if (newScreenshots.length > 5) {
      toast.error('Maximum 5 screenshots allowed')
      return
    }

    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file))
    setScreenshotPreviews(prev => [...prev, ...newPreviews])

    setFormData({ ...formData, screenshots: newScreenshots })
  }

  /**
   * Handle file input change
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      addScreenshots(Array.from(files))
    }
    // Reset input
    e.target.value = ''
  }

  /**
   * Remove screenshot
   */
  const removeScreenshot = (index: number) => {
    const newScreenshots = formData.screenshots?.filter((_, i) => i !== index) || []
    const newPreviews = screenshotPreviews.filter((_, i) => i !== index)

    // Revoke URL to free memory
    URL.revokeObjectURL(screenshotPreviews[index])

    setFormData({ ...formData, screenshots: newScreenshots })
    setScreenshotPreviews(newPreviews)
  }

  /**
   * Cleanup preview URLs on unmount
   */
  useEffect(() => {
    const previews = screenshotPreviews
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url))
    }
  }, [screenshotPreviews])

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (supabaseConfigError) {
      toast.error(supabaseConfigError)
      return
    }

    // Validate form data
    const validation = feedbackFormSchema.safeParse(formData)
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {}
      validation.error.issues.forEach((err) => {
        const field = err.path[0] as string
        fieldErrors[field] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)

    try {
      // Get user email if available
      const userEmail = await getUserEmail()

      // Upload screenshots if any
      let screenshotUrls: string[] = []
      if (formData.screenshots && formData.screenshots.length > 0) {
        const uploadFormData = new FormData()
        formData.screenshots.forEach((file, index) => {
          uploadFormData.append(`screenshot_${index}`, file)
        })

        const uploadResponse = await fetch('/api/feedback/upload-screenshots', {
          method: 'POST',
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json()
          throw new Error(uploadError.error || 'Failed to upload screenshots')
        }

        const uploadData = await uploadResponse.json()
        screenshotUrls = uploadData.urls || []
      }

      // Prepare request payload
      const payload = {
        type: formData.type,
        description: formData.description,
        pageUrl: window.location.href,
        userEmail,
        timestamp: new Date().toISOString(),
        screenshotUrls,
      }

      // Submit to API
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data: FeedbackResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      // Success!
      toast.success(data.message || 'Thank you for your feedback!')
      capturePostHogEvent('feedback_submitted', {
        type: formData.type,
        hasScreenshots: screenshotUrls.length > 0,
      })

      // Reset form and close modal
      screenshotPreviews.forEach(url => URL.revokeObjectURL(url))
      setFormData({
        type: FeedbackType.OTHER,
        description: '',
        screenshots: [],
      })
      setScreenshotPreviews([])
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to submit feedback. Please try again.'
      )
      capturePostHogEvent('feedback_submission_failed', {
        type: formData.type,
        hasScreenshots: Boolean(formData.screenshots?.length),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      screenshotPreviews.forEach(url => URL.revokeObjectURL(url))
      setFormData({
        type: FeedbackType.OTHER,
        description: '',
        screenshots: [],
      })
      setScreenshotPreviews([])
      setErrors({})
      onOpenChange(false)
    }
  }, [isSubmitting, screenshotPreviews, onOpenChange])

  // Handle ESC key
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, isSubmitting, handleClose])

  useEffect(() => {
    if (!open) return

    const dialog = dialogRef.current
    if (!dialog) return

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null
    const triggerNode = triggerRef?.current ?? null

    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    const getFocusableElements = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter(
        element =>
          !element.hasAttribute('disabled') &&
          element.getAttribute('aria-hidden') !== 'true'
      )

    const focusFirstElement = () => {
      const focusableElements = getFocusableElements()
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      } else {
        dialog.focus()
      }
    }

    focusFirstElement()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return
      }

      const focusableElements = getFocusableElements()

      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (activeElement === firstElement || !dialog.contains(activeElement)) {
          event.preventDefault()
          lastElement.focus()
        }
        return
      }

      if (activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) {
        event.stopPropagation()
        focusFirstElement()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)

      const focusTarget = triggerNode ?? previouslyFocusedElementRef.current
      focusTarget?.focus()
    }
  }, [open, triggerRef])

  if (!open || !mounted) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border bg-background p-6 shadow-lg"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 id={titleId} className="text-xl font-semibold">
            Share Your Feedback
          </h2>
          <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
            Help us improve Audiograph by sharing your thoughts, reporting bugs, or suggesting new features.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {supabaseConfigError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {supabaseConfigError}
            </div>
          ) : null}

          {/* Feedback Type */}
          <div>
            <label className="block text-sm font-medium mb-3">
              What type of feedback would you like to share?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {FEEDBACK_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: value })}
                  disabled={isSubmitting || Boolean(supabaseConfigError)}
                  className={cn(
                    'flex flex-col items-center justify-center min-h-[80px] px-3 py-3 text-xs border rounded-lg',
                    'hover:bg-accent transition-all duration-200',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    formData.type === value
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-input'
                  )}
                  aria-label={`Select ${label}`}
                  aria-pressed={formData.type === value}
                >
                  <Icon className="h-6 w-6 mb-2" />
                  <span className="font-medium text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
            {errors.type && <p className="mt-2 text-sm text-destructive">{errors.type}</p>}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="feedback-description"
              className="block text-sm font-medium mb-2"
            >
              Description <span className="text-destructive">*</span>
            </label>
            <textarea
              id="feedback-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              onPaste={handlePaste}
              placeholder="Please describe your feedback in detail... (Paste screenshots with Ctrl/Cmd+V)"
              rows={6}
              disabled={isSubmitting || Boolean(supabaseConfigError)}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                errors.description ? 'border-destructive' : 'border-input'
              )}
            />
            <div className="mt-1 flex justify-between items-center">
              {errors.description ? (
                <p className="text-sm text-destructive">{errors.description}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Minimum 10 characters</p>
              )}
              <p className="text-xs text-muted-foreground">{formData.description.length} / 5000</p>
            </div>
          </div>

          {/* Screenshots */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                Screenshots (Optional)
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={
                  isSubmitting ||
                  Boolean(supabaseConfigError) ||
                  (formData.screenshots?.length || 0) >= 5
                }
                className="text-sm text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                + Add Screenshot
              </button>
            </div>

            {/* Screenshot Previews */}
            {screenshotPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                {screenshotPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeScreenshot(index)}
                      disabled={isSubmitting || Boolean(supabaseConfigError)}
                      className="absolute top-1 right-1 bg-destructive hover:bg-destructive/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="absolute bottom-1 left-1 bg-background/75 backdrop-blur-sm rounded px-2 py-0.5 text-xs">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isSubmitting || Boolean(supabaseConfigError)}
            />

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                💡 <strong>Tip:</strong> Paste screenshots directly with Ctrl/Cmd+V or click &quot;Add Screenshot&quot; to upload. Maximum 5 screenshots.
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> Your feedback will be automatically sent to our team along
              with the current page URL. If you&apos;re logged in, we&apos;ll include your email
              so we can follow up if needed.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isSubmitting || Boolean(supabaseConfigError)}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
