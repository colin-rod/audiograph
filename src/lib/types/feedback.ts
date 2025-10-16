import { z } from 'zod'

/**
 * Feedback types for categorization
 */
export const FeedbackType = {
  BUG: 'Bug',
  FEATURE_REQUEST: 'Feature Request',
  UX_ISSUE: 'UX Issue',
  OTHER: 'Other',
} as const

export type FeedbackTypeValue = (typeof FeedbackType)[keyof typeof FeedbackType]

/**
 * Form data submitted by user
 */
export interface FeedbackFormData {
  type: FeedbackTypeValue
  description: string
  screenshots?: File[]
}

/**
 * Complete feedback data with auto-captured metadata
 */
export interface FeedbackData extends FeedbackFormData {
  pageUrl: string
  userEmail?: string
  timestamp: string
  screenshotUrls?: string[]
}

/**
 * API request body validation schema
 */
export const feedbackRequestSchema = z.object({
  type: z.enum([
    FeedbackType.BUG,
    FeedbackType.FEATURE_REQUEST,
    FeedbackType.UX_ISSUE,
    FeedbackType.OTHER,
  ]),
  description: z
    .string()
    .min(10, 'Please provide at least 10 characters')
    .max(5000, 'Description is too long (max 5000 characters)'),
  pageUrl: z.string().url('Invalid page URL'),
  userEmail: z.string().email().optional(),
  timestamp: z.string().datetime(),
  screenshotUrls: z.array(z.string().url()).optional(),
})

/**
 * Form validation schema (client-side)
 */
export const feedbackFormSchema = z.object({
  type: z.enum([
    FeedbackType.BUG,
    FeedbackType.FEATURE_REQUEST,
    FeedbackType.UX_ISSUE,
    FeedbackType.OTHER,
  ]),
  description: z
    .string()
    .min(10, 'Please provide at least 10 characters')
    .max(5000, 'Description is too long (max 5000 characters)'),
})

/**
 * API response types
 */
export interface FeedbackSuccessResponse {
  success: true
  message: string
}

export interface FeedbackErrorResponse {
  success: false
  error: string
  details?: unknown
}

export type FeedbackResponse = FeedbackSuccessResponse | FeedbackErrorResponse
