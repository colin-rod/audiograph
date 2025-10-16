import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { captureServerException } from '@/lib/monitoring/sentry/server'
import { submitFeedbackToLinear } from '@/lib/linear/client'
import { feedbackRequestSchema } from '@/lib/types/feedback'

/**
 * POST /api/feedback - Submit feedback
 *
 * Creates a Linear issue under CRO-558 with appropriate labels
 * Allows anonymous submissions
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Received feedback submission')

    // Parse and validate request body
    const body = await request.json()

    let validatedData
    try {
      validatedData = feedbackRequestSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.warn('Invalid feedback submission:', error.issues)
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid input data',
            details: error.issues,
          },
          { status: 400 }
        )
      }
      throw error
    }

    // Submit to Linear
    const result = await submitFeedbackToLinear(validatedData)

    if (!result.success) {
      console.error('Failed to submit feedback to Linear:', result.error)
      void captureServerException(result.error ?? 'Unknown Linear error', {
        tags: { action: 'submit_feedback' },
        extra: {
          type: validatedData.type,
          hasScreenshots: Boolean(validatedData.screenshotUrls?.length),
        },
      })
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to submit feedback',
        },
        { status: 500 }
      )
    }

    console.log('Feedback successfully submitted to Linear:', {
      issueId: result.issueId,
      type: validatedData.type,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for your feedback! We appreciate you helping us improve.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error processing feedback submission:', error)
    void captureServerException(error, {
      tags: { action: 'submit_feedback' },
    })

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while submitting your feedback',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/feedback - Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Feedback API is operational',
  })
}
