import { LinearClient } from '@linear/sdk'
import type { FeedbackData, FeedbackTypeValue } from '@/lib/types/feedback'

/**
 * Linear SDK client singleton
 */
let linearClient: LinearClient | null = null

/**
 * Get or create Linear client instance
 */
function getLinearClient(): LinearClient {
  if (!process.env.LINEAR_API_KEY) {
    throw new Error('LINEAR_API_KEY environment variable is not configured')
  }

  if (!linearClient) {
    linearClient = new LinearClient({
      apiKey: process.env.LINEAR_API_KEY,
    })
  }

  return linearClient
}

/**
 * Get the Linear team ID from environment or query
 */
async function getTeamId(): Promise<string> {
  // First try environment variable
  if (process.env.LINEAR_TEAM_ID) {
    return process.env.LINEAR_TEAM_ID
  }

  // Fall back to querying the first team
  const client = getLinearClient()
  const teams = await client.teams()

  if (!teams.nodes.length) {
    throw new Error('No Linear teams found for this API key')
  }

  const teamId = teams.nodes[0].id
  console.log('Using first available Linear team:', teamId)

  return teamId
}

/**
 * Get the label ID for a specific feedback type
 * Maps to the labels from your Linear project
 */
async function getFeedbackLabelId(type: FeedbackTypeValue): Promise<string | undefined> {
  const client = getLinearClient()

  // Map feedback types to Linear label names
  const labelName = type === 'Bug' ? 'Bug Report' :
                    type === 'Feature Request' ? 'Feature Request' :
                    type === 'UX Issue' ? 'UX Issue' :
                    'General'

  // Query for existing label
  const labels = await client.issueLabels({
    filter: {
      name: { eq: labelName },
    },
  })

  if (labels.nodes.length > 0) {
    return labels.nodes[0].id
  }

  console.log(`Label "${labelName}" not found in Linear`)
  return undefined
}

/**
 * Get the parent issue ID (CRO-558)
 */
async function getParentIssueId(): Promise<string> {
  // First try environment variable
  if (process.env.LINEAR_PARENT_ISSUE_ID) {
    return process.env.LINEAR_PARENT_ISSUE_ID
  }

  const client = getLinearClient()

  // Query for CRO-558
  const issues = await client.issues({
    filter: {
      number: { eq: 558 },
    },
  })

  if (issues.nodes.length === 0) {
    throw new Error('Parent issue CRO-558 not found')
  }

  return issues.nodes[0].id
}

/**
 * Format feedback data into Linear issue description
 */
function formatIssueDescription(feedback: FeedbackData): string {
  const sections = [
    '## Feedback',
    feedback.description,
    '',
  ]

  // Add screenshots if present
  if (feedback.screenshotUrls && feedback.screenshotUrls.length > 0) {
    sections.push('## Screenshots')
    feedback.screenshotUrls.forEach((url, index) => {
      sections.push(`![Screenshot ${index + 1}](${url})`)
    })
    sections.push('')
  }

  sections.push(
    '## Metadata',
    `**Type:** ${feedback.type}`,
    `**Page:** ${feedback.pageUrl}`,
    `**User:** ${feedback.userEmail || 'Anonymous'}`,
    `**Timestamp:** ${feedback.timestamp}`,
  )

  return sections.join('\n')
}

/**
 * Create issue title from feedback
 */
function createIssueTitle(feedback: FeedbackData): string {
  const maxLength = 50
  const descPreview = feedback.description.slice(0, maxLength)
  const truncated = feedback.description.length > maxLength ? '...' : ''

  return `[${feedback.type}] ${descPreview}${truncated}`
}

/**
 * Submit feedback to Linear as an issue
 */
export async function submitFeedbackToLinear(
  feedback: FeedbackData
): Promise<{ success: boolean; issueId?: string; error?: string }> {
  try {
    console.log('Submitting feedback to Linear:', {
      type: feedback.type,
      hasEmail: !!feedback.userEmail,
    })

    const client = getLinearClient()
    const teamId = await getTeamId()
    const labelId = await getFeedbackLabelId(feedback.type)
    const parentId = await getParentIssueId()

    const issueResult = await client.createIssue({
      teamId,
      title: createIssueTitle(feedback),
      description: formatIssueDescription(feedback),
      parentId,
      labelIds: labelId ? [labelId] : [],
    })

    if (!issueResult.success || !issueResult.issue) {
      console.error('Failed to create Linear issue:', {
        success: issueResult.success,
      })
      return {
        success: false,
        error: 'Failed to create issue in Linear',
      }
    }

    const issue = await issueResult.issue
    console.log('Successfully created Linear issue:', issue.id)

    return {
      success: true,
      issueId: issue.id,
    }
  } catch (error) {
    console.error('Error submitting feedback to Linear:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Test Linear connection and configuration
 */
export async function testLinearConnection(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const client = getLinearClient()
    const viewer = await client.viewer

    console.log('Linear connection test successful:', {
      userName: viewer.name,
      userEmail: viewer.email,
    })

    return { success: true }
  } catch (error) {
    console.error('Linear connection test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
