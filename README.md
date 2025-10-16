This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

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

## Continuous Integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on pushes to `main` and every pull request. The job installs dependencies with `npm ci` and executes linting, static type checks, and the Vitest unit suite to guard the TDD pipeline in CI.

## Branching Workflow

Direct pushes to `main` are blocked by `.github/workflows/protect-main.yml`. Develop features on dedicated branches, push them, and open a pull request for review. For full enforcement (required reviews, status checks, linear history), add matching branch protection rules in the repository settings.

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
