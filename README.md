This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

Before running the application, you need to configure Supabase:

1. **Set up Supabase**: Follow the [Supabase Setup Guide](docs/SUPABASE_SETUP.md) to:
   - Create a Supabase project
   - Configure environment variables
   - Set up database tables and storage buckets
   - Run database migrations

2. **Configure Environment**: Copy `.env.example` to `.env.local` and add your Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```
   Then update `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with your actual values.

### Run the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Testing & TDD Workflow

The project ships with a Vitest + Testing Library setup tuned for the App Router and the local `@` alias.

- `npm run test:watch` &mdash; primary red/green feedback loop while you iterate on a feature.
- `npm run test` &mdash; single run for pre-commit checks or CI.
- `npm run test:coverage` &mdash; generates HTML, lcov, and text coverage reports in `coverage/`.
- `npm run lint` &mdash; keep ESLint warnings from creeping in during implementation.
- `npm run typecheck` &mdash; verify the TypeScript surface after each refactor.

### Writing Tests

- colocate tests next to the code under `src/` using the `.test.tsx`/`.test.ts` suffix (e.g. `src/components/ui/button.test.tsx`).
- Use JSX freely in tests; the config enables the automatic React transform and a jsdom environment.
- Shared test utilities and global setup belong in `src/test/`. `src/test/setupTests.ts` currently wires up `@testing-library/jest-dom`.

### Recommended Cycle

1. Start `npm run test:watch`.
2. Add or update a spec that captures the desired behaviour (go red).
3. Implement the minimal code to satisfy the test (go green).
4. Refactor with confidence, keeping the watch run green.
5. Finish with `npm run lint`, `npm run typecheck`, and `npm run test` (plus `npm run test:coverage` when you want detailed metrics) before raising a PR.

## Time-Based Insights

- **Weekly cadence chart** – Aggregate `ms_played` by week number to surface seasonal or holiday listening spikes, complementing the existing monthly view.
- **Listening streaks** – Compute the longest run of consecutive days with any playback to create a "streak" card or calendar visualization.

## Monitoring & Analytics

A lightweight telemetry layer ships with the app to help surface production errors and usage patterns. Both integrations stay dormant unless the required environment variables are present.

### Sentry error reporting

- Configure the DSN in both server and browser environments:

  ```bash
  SENTRY_DSN="https://PUBLIC_KEY@o123.ingest.sentry.io/456"
  NEXT_PUBLIC_SENTRY_DSN="https://PUBLIC_KEY@o123.ingest.sentry.io/456"
  ```

- Optional environment metadata:

  ```bash
  SENTRY_ENVIRONMENT="production"
  SENTRY_RELEASE="v1.0.0"
  NEXT_PUBLIC_SENTRY_ENVIRONMENT="production"
  NEXT_PUBLIC_SENTRY_RELEASE="v1.0.0"
  ```

- `instrumentation.ts` hooks global `uncaughtException` and `unhandledRejection` handlers on the Node runtime so catastrophic failures make it to Sentry even when they bubble past application code.
- `src/components/providers/sentry-provider.tsx` registers `window` listeners for client-side errors and unhandled promise rejections.
- For manual reporting, import `captureServerException`/`captureClientException` from `src/lib/monitoring/sentry` and call them inside error branches. The API posts directly to the Sentry Store endpoint so the SDK dependency footprint stays at zero.

### PostHog product analytics

- Supply your project key (and optionally a custom host) via:

  ```bash
  NEXT_PUBLIC_POSTHOG_KEY="phc_ABC123"
  NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com" # optional, defaults to the US multi-tenant host
  ```

- `src/components/providers/posthog-provider.tsx` initialises an anonymous distinct ID and captures App Router page transitions.
- Helper utilities in `src/lib/monitoring/posthog/client.ts` expose `capturePostHogEvent` for one-off events. The feedback flow already tracks modal opens, successful submissions, and submission failures.
- Distinct IDs are persisted in `localStorage` so the analytics timeline remains consistent between visits without relying on third-party cookies.

## Continuous Integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on pushes to `main` and every pull request. The job installs dependencies with `npm ci` and executes linting, static type checks, and the Vitest unit suite to guard the TDD pipeline in CI.

## Branching Workflow

Direct pushes to `main` are blocked by `.github/workflows/protect-main.yml`. Develop features on dedicated branches, push them, and open a pull request for review. For full enforcement (required reviews, status checks, linear history), add matching branch protection rules in the repository settings.

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Supabase Setup Guide](docs/SUPABASE_SETUP.md)** - Complete guide to setting up Supabase from scratch, including:
  - Creating a Supabase project
  - Configuring environment variables
  - Setting up database tables and storage buckets
  - Running migrations
  - Troubleshooting common issues

- **[Database Schema](docs/DATABASE_SCHEMA.md)** - Detailed database schema documentation, including:
  - Table structures and column definitions
  - Materialized views for analytics
  - Database functions (RPC) for querying
  - Indexes and performance optimization
  - Row Level Security (RLS) policies
  - Best practices for data operations

- **[Storage Buckets](docs/STORAGE_BUCKETS.md)** - Storage bucket configuration guide, including:
  - Bucket setup and configuration
  - Row Level Security policies for storage
  - File upload implementation
  - Security considerations
  - Troubleshooting storage issues

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Getting Your Spotify Data as JSON

Audiograph can visualise the listening history that Spotify shares in its personal data export. Follow the steps below to request the JSON files that the app expects:

1. **Request the archive**
   - Sign in to your account at [spotify.com/account](https://www.spotify.com/account/overview/).
   - In the left navigation choose **Privacy settings** (or browse directly to [spotify.com/account/privacy](https://www.spotify.com/account/privacy/)).
   - Scroll to the **Download your data** section and select **Extended streaming history**.
   - Confirm the email address Spotify should use and click **Request data**. Spotify may ask you to verify ownership of the account.

2. **Wait for Spotify’s email**
   - Spotify prepares the archive in the background; this can take anywhere from a few hours to a couple of days depending on account size.
   - When it is ready you will receive an email titled “Your Spotify data is ready to download”. The email contains a one-time download link that expires after 14 days.

3. **Download and extract the archive**
   - Download the `.zip` file from the email link and store it somewhere safe.
   - Unzip the archive. Inside you will find folders such as `MyData/` that include JSON files (`Streaming_History_Audio.json`, `Streaming_History_Audio_2023.json`, etc.).

4. **Use the JSON in Audiograph**
   - Copy the relevant JSON files into the location expected by your Audiograph workflow (for example, upload them via the app’s UI or place them in the project’s `public/` directory if you are developing locally).
   - Keep the originals in a secure location—Spotify’s archive contains sensitive account information.

For additional detail on the export, review Spotify’s [Support article on personal data](https://support.spotify.com/article/data-rights-and-privacy-settings/).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## FAQ

### How do I start the development server?

Run `npm run dev` (or `yarn dev`, `pnpm dev`, `bun dev`) and open [http://localhost:3000](http://localhost:3000) in your browser. The app will hot reload as you edit files under `src/`.

### Which scripts should I run before committing code?

Run the project quality gates: `npm run lint`, `npm run typecheck`, and `npm run test`. This mirrors the GitHub Actions workflow and prevents avoidable CI failures.

### Where should I place new tests?

Colocate specs next to the code they cover inside `src/`. Name the files with the `.test.ts` or `.test.tsx` suffix so Vitest discovers them automatically.

### How do I run the test suite with coverage?

Execute `npm run test:coverage`. Coverage reports are generated in the `coverage/` directory in HTML, lcov, and text formats.

### What branching strategy should I follow?

Create feature branches instead of committing directly to `main`. Push the branch and open a pull request for review to comply with the repository protections.
