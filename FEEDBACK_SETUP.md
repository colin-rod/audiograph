# Feedback Component Setup Guide

This guide will help you complete the setup for the feedback component with Linear integration.

## Prerequisites

- Linear workspace with API access
- Supabase project with storage enabled
- Linear issue CRO-558 created as parent issue

## Setup Steps

### 1. Configure Linear API

1. Go to Linear Settings → API → Personal API Keys
2. Create a new API key with the following scopes:
   - `read` - Read issues and teams
   - `write` - Create issues and labels
3. Copy the API key

### 2. Get Linear Team ID

Option A: Use the Linear API
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: YOUR_LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ teams { nodes { id name } } }"}'
```

Option B: Leave it blank, the system will use the first team automatically

### 3. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Linear API Configuration
LINEAR_API_KEY=lin_api_xxxxxxxxxxxxxxxxx
LINEAR_TEAM_ID=your_team_id  # Optional, will use first team if not set

# Optional: Override the parent issue ID (defaults to CRO-558)
# LINEAR_PARENT_ISSUE_ID=issue_id_here
```

### 4. Create Supabase Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to Storage
3. Click "Create bucket"
4. Settings:
   - **Name**: `feedback-screenshots`
   - **Public bucket**: ✅ Yes (enabled)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`

5. Set up storage policies (go to Policies tab):

**Policy 1: Public Read Access**
```sql
CREATE POLICY "Public read access for feedback screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'feedback-screenshots');
```

**Policy 2: Anonymous Upload (Optional - if you want anonymous feedback with screenshots)**
```sql
CREATE POLICY "Allow anonymous uploads to feedback screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'feedback-screenshots');
```

**Policy 3: Authenticated Upload**
```sql
CREATE POLICY "Allow authenticated uploads to feedback screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-screenshots');
```

### 5. Verify Linear Labels

The feedback system uses the following labels from your Linear project:
- **Bug Report** (for Bug feedback type)
- **Feature Request** (for Feature Request feedback type)
- **UX Issue** (for UX Issue feedback type)
- **General** (for Other/General feedback type)

These should already exist in your Linear project based on the screenshot you provided. If they don't exist, the system will still work but won't apply labels to the issues.

### 6. Test the Setup

1. Start your development server:
```bash
npm run dev
```

2. Look for the floating "Feedback" button in the bottom-right corner

3. Click it and try submitting feedback:
   - Fill in the feedback form
   - Try pasting a screenshot (Cmd/Ctrl+V)
   - Submit the form

4. Check Linear to verify:
   - New issue was created under CRO-558
   - Issue has the correct label
   - Screenshots are visible (if you uploaded any)
   - Metadata is included in the description

### 7. Troubleshooting

**Issue: "LINEAR_API_KEY environment variable is not configured"**
- Solution: Make sure you added the API key to `.env.local`
- Restart your dev server after adding environment variables

**Issue: "Parent issue CRO-558 not found"**
- Solution: Create the parent issue in Linear or set `LINEAR_PARENT_ISSUE_ID` to an existing issue

**Issue: "Failed to upload screenshots"**
- Solution: Verify the `feedback-screenshots` bucket exists in Supabase
- Check that storage policies are set up correctly
- Ensure the bucket is marked as public

**Issue: Labels not appearing on issues**
- Solution: The labels must exist in Linear with exact names
- Check the Linear settings to verify label names match

## Features

The feedback component includes:

- ✅ **Global floating action button** - Accessible from any page
- ✅ **4 feedback types** - Bug, Feature Request, UX Issue, General
- ✅ **Rich text descriptions** - With character counter (10-5000 chars)
- ✅ **Screenshot support** - Paste from clipboard or upload (max 5 images)
- ✅ **Anonymous feedback** - Works without authentication
- ✅ **User context** - Captures email if user is logged in
- ✅ **Page tracking** - Automatically includes current page URL
- ✅ **Linear integration** - Creates issues under CRO-558 with appropriate labels
- ✅ **Toast notifications** - User feedback for success/error states
- ✅ **Dark mode support** - Respects theme preferences

## Customization

### Changing the Parent Issue

If you want feedback to be grouped under a different issue, set the environment variable:

```bash
LINEAR_PARENT_ISSUE_ID=your_issue_id
```

### Changing Feedback Types

Edit [src/lib/types/feedback.ts](src/lib/types/feedback.ts) to add or remove feedback categories.

### Styling the Button

Edit [src/components/feedback/feedback-button.tsx](src/components/feedback/feedback-button.tsx) to change button position, colors, or text.

### Adjusting Screenshot Limits

Edit the constants in [src/app/api/feedback/upload-screenshots/route.ts](src/app/api/feedback/upload-screenshots/route.ts):
- `MAX_FILE_SIZE` - Currently 5MB
- `MAX_FILES` - Currently 5 screenshots
- `ALLOWED_TYPES` - Currently PNG, JPEG, WebP

## Architecture

```
User clicks Feedback button
    ↓
FeedbackModal opens
    ↓
User fills form + uploads screenshots
    ↓
Screenshots → /api/feedback/upload-screenshots → Supabase Storage
    ↓
Feedback data → /api/feedback → Linear API
    ↓
New issue created under CRO-558 with appropriate label
```

## Files Created

- `src/lib/types/feedback.ts` - Type definitions and schemas
- `src/lib/linear/client.ts` - Linear API client
- `src/components/feedback/feedback-modal.tsx` - Feedback form modal
- `src/components/feedback/feedback-button.tsx` - Floating action button
- `src/components/providers/toaster.tsx` - Toast notification provider
- `src/app/api/feedback/route.ts` - Feedback submission endpoint
- `src/app/api/feedback/upload-screenshots/route.ts` - Screenshot upload endpoint
- `.env.example` - Environment variable template
- `FEEDBACK_SETUP.md` - This setup guide

## Support

If you encounter issues, check:
1. Environment variables are set correctly in `.env.local`
2. Supabase storage bucket exists and is public
3. Linear API key has correct permissions
4. Parent issue CRO-558 exists in Linear
5. Dev server was restarted after adding environment variables
