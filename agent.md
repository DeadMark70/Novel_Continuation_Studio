# Agent Handoff: Novel Continuation Studio

## 1. Mission
- Build a local-first novel continuation studio with a structured Phase 0-5 workflow.
- Support provider/model routing per phase while keeping generation deterministic and debuggable.

## 2. Current Status (2026-02-11)
- Dual-provider support is implemented: NVIDIA NIM + OpenRouter.
- Full pages are active:
  - `/settings` for provider config, phase routing, model params, prompt editing, and context controls.
  - `/history` for reading room, version history, and export.
- Settings persistence was optimized via snapshot-style save (`applySettingsSnapshot`) to reduce slow multi-write saves.
- Prompt editor issues around empty custom prompts were fixed (defaults render correctly; custom prompt is optional overlay).
- OpenRouter paid-network guard is implemented for test/offline environments.

## 3. Runtime Stack
- Framework: Next.js App Router (`next@16.1.6`)
- UI: React 19, Tailwind CSS v4, shadcn/ui, Radix primitives
- State: Zustand (`useWorkflowStore`, `useNovelStore`, `useSettingsStore`)
- Persistence: Dexie/IndexedDB (`lib/db.ts`, schema v7)
- LLM providers:
  - NIM routes: `app/api/nim/*`
  - OpenRouter routes: `app/api/openrouter/*`

## 4. Key Paths
- Main app: `app/page.tsx`
- Settings page: `app/settings/page.tsx`
- History page: `app/history/page.tsx`
- Generation orchestration: `hooks/useStepGenerator.ts`
- LLM client: `lib/llm-client.ts`
- Provider settings + routing resolution: `store/useSettingsStore.ts`
- DB schema/migration: `lib/db.ts`
- OpenRouter guard: `lib/openrouter-guard.ts`
- E2E smoke tests: `e2e/smoke.spec.js`

## 5. State Model (Important)
- `providers[provider]`: API key, selected model, recent models, parameter support map.
- `phaseConfig[phase]`: explicit `{ provider, model }` selection for each phase.
- `providerDefaults[provider]`: default generation params.
- `modelOverrides[provider][model]`: per-model override params.
- `getResolvedGenerationConfig(phase)`: effective config resolution entrypoint used by generation flow.

Resolution order:
1. Phase provider/model (`phaseConfig`)
2. Provider default params (`providerDefaults`)
3. Model overrides (`modelOverrides`)

## 6. Reliability Rules
- Global generation mutex remains: only one active generation at a time.
- NIM streaming client keeps inactivity-timeout and retry behavior.
- OpenRouter requests are blocked when either is true:
  - `E2E_MODE=offline`
  - `OPENROUTER_DISABLE_NETWORK=1`

## 7. Cost-Safety / Environment Notes
- User preference: avoid paid OpenRouter calls unless explicitly needed.
- Recommended local/CI defaults:
  - Use NIM as default provider.
  - Keep `OPENROUTER_DISABLE_NETWORK=1` for routine test runs.
- Do not run live OpenRouter integration tests without explicit confirmation.

## 8. Development Commands
- Dev: `npm run dev`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Unit tests: `npm test`
- E2E smoke: `npm run e2e`

## 9. Documentation Anchors
- `README.md`
- `conductor/tracks.md`
- `conductor/product.md`
- `conductor/tech-stack.md`

