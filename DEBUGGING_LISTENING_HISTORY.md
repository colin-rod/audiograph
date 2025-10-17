# Debugging Listening History Issues

## Overview
This document explains the logging and error handling improvements added to debug the "Failed to load listening history" issue.

## What Was Changed

### 1. Database Functions (Migration: 20251017_add_logging_to_rpc_functions.sql)

All RPC functions now include:
- **Detailed logging** using PostgreSQL's `RAISE LOG` statements
- **Better error messages** for authentication issues
- **Exception handling** to catch and log errors properly

#### Logging Points:
- Function entry with all parameters
- User authentication status (logged as user_id or 'NULL')
- Total count results for pagination
- Number of rows returned
- Any errors with SQLSTATE and message

### 2. Frontend Error Handling

#### analytics-service.ts
Added console logging to track:
- Request parameters being sent
- Errors returned from Supabase
- Success cases with row counts
- More specific error messages based on error codes

#### listening-history.tsx
- Now displays the actual error message from the backend instead of a generic message
- Better console logging with prefixes for easier filtering

## The Root Issue

Based on the error log provided, the issue is **authentication-related**:

```json
{
  "role": "anon",
  "subject": null  // ← No authenticated user!
}
```

The request is being made with the `anon` (anonymous) JWT token instead of an authenticated user token. All RPC functions check for `auth.uid()` and now explicitly raise an error if no user is authenticated.

## How to Use the Logs

### 1. View Database Logs in Supabase

1. Go to your Supabase dashboard
2. Navigate to **Logs** → **Database**
3. Look for log entries starting with:
   - `get_listening_history called - user_id:`
   - `get_listening_history - total_count:`
   - `get_listening_history ERROR`

### 2. View Frontend Logs in Browser Console

Open the browser console and look for:
- `[Analytics] Fetching listening history with params:`
- `[Analytics] Error fetching listening history:`
- `[Analytics] Listening history fetched successfully:`
- `[ListeningHistory] Error:`

### 3. What to Check

1. **Authentication Status**
   - Check if the user is logged in
   - Verify the JWT token includes a valid `sub` (subject) claim with the user ID
   - Check if the session is still valid

2. **Request Parameters**
   - Verify dates are being sent in the correct format (ISO 8601)
   - Check if search query is properly formatted
   - Ensure pagination parameters are positive integers

3. **Database Permissions**
   - Verify RLS policies allow the user to access their data
   - Check that the `listens` table has proper user_id filtering

## Expected Error Messages

Based on the new error handling, you should see:

| Error Code | Message | Cause |
|------------|---------|-------|
| AUTH1 | "Please log in to view your listening history" | No authenticated user |
| PGRST116 | "Database function not found. Please contact support." | Function doesn't exist |
| Other | Original error message | Other database errors |

## Next Steps to Fix the Issue

1. **Check Authentication Flow**
   - Verify the user is properly authenticated before accessing the listening history page
   - Check if the Supabase client is properly configured with auth headers
   - Look for auth state changes that might clear the session

2. **Verify Supabase Client Setup**
   Check [createSupabaseBrowserClient](src/lib/supabaseClient.ts) to ensure:
   - It's using the correct auth configuration
   - Session persistence is working
   - Auth headers are included in requests

3. **Check for Token Refresh Issues**
   - The session might be expiring
   - Token refresh might be failing
   - Check if there are any CORS issues preventing auth

4. **Review the Component Mounting**
   - Ensure the component doesn't render before auth is established
   - Check if there's a race condition between auth initialization and data fetching

## Example Log Output

### Successful Request
```
[Analytics] Fetching listening history with params: {
  search_query: null,
  start_date: "2025-04-03T00:00:00.000Z",
  end_date: "2025-11-06T23:59:59.999Z",
  limit_count: 50,
  offset_count: 0
}
[Analytics] Listening history fetched successfully: {
  rowCount: 10,
  totalCount: 42
}
```

### Failed Request (Not Authenticated)
```
[Analytics] Fetching listening history with params: { ... }
[Analytics] Error fetching listening history: {
  code: "AUTH1",
  message: "Authentication required: No authenticated user found..."
}
[ListeningHistory] Error: AnalyticsError: Please log in to view your listening history
```

## Database Log Example

```
LOG: get_listening_history called - user_id: 123e4567-e89b-12d3-a456-426614174000, search_query: NULL, start_date: 2025-04-03 00:00:00+00, end_date: 2025-11-06 23:59:59.999+00, limit: 50, offset: 0
LOG: get_listening_history - total_count: 42 for user_id: 123e4567-e89b-12d3-a456-426614174000
LOG: get_listening_history - returned 10 rows
```

## Testing the Fixes

1. **Test with authenticated user:**
   - Log in properly
   - Navigate to listening history
   - Check browser console for `[Analytics]` logs
   - Check Supabase logs for function calls with valid user_id

2. **Test with unauthenticated user:**
   - Log out
   - Try to access listening history
   - Should see: "Please log in to view your listening history"
   - Check logs for `user_id: NULL`

3. **Test error scenarios:**
   - Invalid date ranges
   - Very large pagination offsets
   - Special characters in search queries

## Support

If the issue persists after checking the above:
1. Collect the browser console logs
2. Export the Supabase database logs for the timeframe
3. Check the authentication state in the browser's Application/Storage tab
4. Verify the JWT token payload using jwt.io
