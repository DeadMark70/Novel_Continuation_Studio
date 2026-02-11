# Technology Stack

## Core Frameworks
- Frontend: React 19
- Meta-framework: Next.js App Router 16.1.6
- Language: TypeScript

## UI & Styling
- Tailwind CSS v4
- shadcn/ui + Radix UI primitives
- Lucide React icons
- Design direction: Noir Industrial command-center style

## State & Persistence
- Zustand stores:
  - `useWorkflowStore`: phase execution + generation lock (`isGenerating`)
  - `useNovelStore`: novel/session data, restore/reset, history
  - `useSettingsStore`: provider settings, phase routing, defaults, model overrides, prompt customizations
- IndexedDB via Dexie (`lib/db.ts`)
  - Current schema version: v7
  - Persists provider-scoped settings, phase config, model overrides, prompts, context settings

## AI & Integration
- Providers:
  - NVIDIA NIM (`app/api/nim/*`)
  - OpenRouter (`app/api/openrouter/*`)
- Streaming protocol: SSE from local API routes to client
- Client orchestration: `lib/llm-client.ts`
- Effective config resolution: `getResolvedGenerationConfig(phase)` in `store/useSettingsStore.ts`

## Network & Cost Controls
- OpenRouter network guard: `lib/openrouter-guard.ts`
- OpenRouter calls blocked when:
  - `E2E_MODE=offline`, or
  - `OPENROUTER_DISABLE_NETWORK=1`
- Recommended default for CI/smoke: keep OpenRouter disabled to avoid paid calls

## Testing Tooling
- Unit/integration: Vitest + Testing Library + jsdom
- E2E smoke: Playwright (`e2e/smoke.spec.js`)
- Static checks: TypeScript (`npx tsc --noEmit`) + ESLint (`npm run lint`)
