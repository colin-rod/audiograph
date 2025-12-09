// Cron configuration for automatic Spotify enrichment
// This can be set up in Supabase dashboard or via CLI

export const cronConfig = {
  // Run every hour
  schedule: '0 * * * *',

  // Or run every 6 hours (more conservative)
  // schedule: '0 */6 * * *',

  // Or run daily at 2 AM
  // schedule: '0 2 * * *',
}

// To set up via Supabase CLI:
// 1. Add to supabase/functions/_shared/cron.ts
// 2. Deploy: npx supabase functions deploy spotify-enrichment
// 3. Enable cron in Supabase dashboard

// To set up via Supabase dashboard:
// 1. Navigate to Database > Extensions
// 2. Enable pg_cron extension
// 3. Go to Database > Cron Jobs
// 4. Create new job:
//    - Name: spotify-enrichment
//    - Schedule: 0 * * * * (every hour)
//    - Command: SELECT net.http_post(
//        url:='https://your-project.supabase.co/functions/v1/spotify-enrichment',
//        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
//        body:='{"batch_size": 50}'::jsonb
//      );
