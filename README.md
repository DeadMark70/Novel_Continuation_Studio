## Novel Continuation Studio

Multi-provider local writing workflow studio (NVIDIA NIM + OpenRouter) with phase-level model routing.

## Getting Started

### 1) Install and run

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

### 2) Environment

Create `.env.local` with at least one provider key:

```bash
NIM_API_KEY=
OPENROUTER_API_KEY=
# optional OpenRouter attribution headers
OPENROUTER_SITE_URL=
OPENROUTER_SITE_NAME=
```

### 3) Settings model

- `/settings` controls provider credentials, provider default model params, phase routing, and prompts.
- Each phase (`compression`, `analysis`, `outline`, `breakdown`, `chapter1`, `continuation`) can choose `provider + model`.
- Effective generation config resolution:
  1. phase selection provider/model
  2. provider defaults
  3. model override (if present)

### 4) History

- `/history` provides reading room, version history, and TXT export.

### 5) Quality gates (recommended)

```bash
npx tsc --noEmit
npm run lint
npm test
```

### 6) E2E smoke checks (Playwright)

Install browser binaries once:

```bash
npx playwright install
```

Run smoke tests:

```bash
npm run e2e
```

Notes:
- `playwright.config.js` starts `npm run dev` automatically unless `PLAYWRIGHT_BASE_URL` is set.
- Current smoke suite: `e2e/smoke.spec.js`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
