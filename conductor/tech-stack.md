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
- Font strategy: local CSS fallback stack via `--font-geist-sans` / `--font-geist-mono` (offline-safe build, no Google font fetch dependency)

## State & Persistence
- Zustand stores:
  - `useWorkflowStore`: phase execution + generation lock (`isGenerating`)
  - `useNovelStore`: novel/session data, restore/reset, history
  - `useSettingsStore`: provider settings, phase routing, defaults, model overrides, prompt customizations
  - `useLorebookStore`: lore card CRUD + batch insert for multi-card extraction
  - **Hydration**: `useNovelStore` hydrates `useWorkflowStore` during initialization to maintain phase progress.
- IndexedDB via Dexie (`lib/db.ts`)
  - Current schema version: v13
  - Persists provider-scoped settings, phase config, model overrides, prompts, context settings, and per-session phase outputs (Phase 0-4).
  - `useNovelStore.setNovel` uses debounced persistence to reduce write amplification while typing.
  - Session-switch paths flush pending debounced writes before loading/deleting sessions.
  - Lorebook table persists character/world cards keyed by `novelId`.

## AI & Integration
- Providers:
  - NVIDIA NIM (`app/api/nim/*`)
  - OpenRouter (`app/api/openrouter/*`)
- Streaming protocol: SSE from local API routes to client
- Client orchestration: `lib/llm-client.ts`
- Effective config resolution: `getResolvedGenerationConfig(phase)` in `store/useSettingsStore.ts`
- Lore extraction stack:
  - `loreExtractor` phase for initial extraction
  - `loreJsonRepair` phase for second-pass JSON repair
  - target-aware extraction modes: `singleCharacter`, `multipleCharacters`, `worldLore`
  - strict manual-list filtering and ordering for requested character sets

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
- Key suites include:
  - lore extraction parser/repair coverage (`__tests__/lore-extractor.test.ts`)
  - settings resolution and phase config coverage (`__tests__/useSettingsStore.test.ts`)
  - LLM parameter filtering and overflow retry coverage (`__tests__/llm-param-filtering.test.ts`)
