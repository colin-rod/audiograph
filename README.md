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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
