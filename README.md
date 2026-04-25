# Example HR — Time off

Demo **time-off** UI for **Example HR**: employees see **per-location** balances and submit requests; managers review a **pending queue** with **live** HCM balance context. Human Capital Management (HCM) is the **source of truth**; this app uses optimistic updates, reconciliation on background refresh, and RTK Query cache invalidation (see **`TRD.md`** for the full design).

**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Redux Toolkit, RTK Query, MSW, Storybook, Jest.

## Requirements

- **Node.js** 18+ (LTS recommended)
- **npm** (or pnpm / yarn)

## Setup

```bash
git clone <your-repo-url>
cd examplehr-timeoff
npm install
```

### Environment

Copy `.env.example` to **`.env.local`** (Next loads this automatically) and adjust if needed:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_ENABLE_MSW` | When `true`, the browser registers **MSW** so some requests can be intercepted; unhandled calls still reach the Next **Route Handlers** (`/api/hcm/*`). Omit or set `false` to use the in-memory HCM API only. |

Do **not** commit `.env` or `.env.local` (they are gitignored by pattern—keep secrets out of the repo).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server — [http://localhost:3000](http://localhost:3000) |
| `npm run build` | Production build |
| `npm start` | Serve production build (run `build` first) |
| `npm run lint` | ESLint |
| `npm test` | Jest test suite |
| `npm run test:coverage` | Jest with coverage report (see `coverage/lcov-report/index.html`) |
| `npm run storybook` | Storybook at [http://localhost:6006](http://localhost:6006) |
| `npm run build-storybook` | Static Storybook output (default: `storybook-static/`) |

## App routes

| Path | Role |
|------|------|
| `/` | Employee: balance + request form (demo: `emp-1` / `loc-1`) |
| `/manager` | Manager: pending approvals with live balance per request |

Mock HCM logic lives in **`src/lib/hcmStore.ts`** and is exposed via **`src/app/api/hcm/**` route handlers.

## Documentation

- **`TRD.md`** — Technical Requirements Document: challenges, architecture, optimistic vs pessimistic updates, cache invalidation and reconciliation, component ↔ state mapping, test and Storybook strategy.

## Testing and coverage

```bash
npm test
npm run test:coverage
```

Coverage thresholds apply to the modules listed in `jest.config.js` (`collectCoverageFrom`). Open **`coverage/lcov-report/index.html`** in a browser for a full report.

## Storybook

```bash
npm run storybook
```

Stories live under **`src/stories/`** and use **MSW** (see `.storybook/preview.ts`) for API scenarios. For a static build to deploy (e.g. Vercel static hosting), use `npm run build-storybook` and serve the output directory.

## Deploying the Next app

The app is a standard Next.js project. See the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) (e.g. Vercel or any Node host with `next start` after `next build`).
