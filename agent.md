# Agent Handoff: Novel Continuation Studio

## 1. Mission
- Build a local-first novel continuation studio with a structured Phase 0-5 workflow.
- Support provider/model routing per phase while keeping generation deterministic and debuggable.

## 2. Current Status (2026-02-17)
- Dual-provider support is implemented: NVIDIA NIM + OpenRouter.
- Full pages are active:
  - `/settings` for provider config, phase routing, model params, prompt editing, and context controls.
  - `/history` for reading room, version history, and export.
- Settings persistence was optimized via snapshot-style save (`applySettingsSnapshot`) to reduce slow multi-write saves.
- Prompt editor issues around empty custom prompts were fixed (defaults render correctly; custom prompt is optional overlay).
- OpenRouter paid-network guard is implemented for test/offline environments.
- Phase 0-4 outputs and Phase 2 manual guidance (plotDirection) are now correctly persisted and hydrated on refresh (2026-02-12).
- Multi-session generation is enabled across novels. Single-session concurrent multi-phase is intentionally blocked.
- Rendering freeze during concurrent Phase 0 runs was mitigated by:
  - reducing broad Zustand subscriptions to selector-based subscriptions (`useShallow`)
  - adding a global LLM streaming concurrency limiter
  - yielding control back to main thread during SSE streaming loops
  - removing redundant large writes during compression completion
- 2026-02-17 maintenance hardening was completed:
  - `e2e/resilience.spec.js` Flow A assertion updated and stabilized (13/13 pass).
  - `useNovelStore.setNovel` now uses debounced persistence (350ms) with pending-write flush before session switches.
  - Workflow UI subscriptions were narrowed (`WorkflowStepper`, `StepAnalysis`, `StepOutline`, `StepContinuation`) and `currentStepId` now has runtime guard.
  - Blocking `alert/confirm` interactions were replaced with Dialog flows in studio/settings critical paths.
  - `VersionList` row interaction is keyboard-operable (`button` semantics + accessible labels).
  - `next/font/google` dependency was removed in `app/layout.tsx` for offline-safe builds.
  - Added `app/error.tsx` and `app/not-found.tsx`.
  - Added high-risk tests for `useStepGenerator` (error recovery, continuation auto-queue, duplicate enqueue guard), raising statements coverage from ~3.18% to ~34.66%.

## 3. Runtime Stack
- Framework: Next.js App Router (`next@16.1.6`)
- UI: React 19, Tailwind CSS v4, shadcn/ui, Radix primitives
- State: Zustand (`useWorkflowStore`, `useNovelStore`, `useSettingsStore`)
- Persistence: Dexie/IndexedDB (`lib/db.ts`, schema v11)
- LLM providers:
  - NIM routes: `app/api/nim/*`
  - OpenRouter routes: `app/api/openrouter/*`

## 4. Agent Skills
- **vercel-react-best-practices**: Guidelines for React 19/Next.js performance and patterns.
- **vercel-composition-patterns**: React component architecture and composition.
- **web-design-guidelines**: Accessibility and UI best practices.
- **chrome-devtools**: Browser debugging and automation.

## 5. Key Paths
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
- Cross-novel parallel generation is supported.
- Same novel session is single-run at a time (no concurrent multi-phase within one session).
- NIM streaming client keeps inactivity-timeout and retry behavior.
- OpenRouter requests are blocked when either is true:
  - `E2E_MODE=offline`
  - `OPENROUTER_DISABLE_NETWORK=1`

## 6.1 Rendering Freeze Prevention (2026-02 Incident)
- Symptom:
  - Navigating to `/settings` showed persistent `rendering` while Phase 0 was running in one or more sessions.
  - Stopping Phase 0 immediately restored normal navigation.
- Root causes:
  - Event-loop starvation from concurrent SSE stream processing loops.
  - Excessive client re-render from broad store subscriptions (`useStore()` full state reads).
  - Redundant large IndexedDB writes at Phase 0 completion.
- Guardrails:
  - Keep streaming loops cooperative: periodically `await yieldToMain()` in long-running async loops.
  - Limit concurrent provider streaming requests globally (keep free network/main-thread capacity for route transitions).
  - Use selector subscriptions (`useShallow`) for Zustand consumers, especially large pages (`/settings`, `/history`).
  - Avoid duplicate writes of large payloads; phase completion should persist once per artifact set.
- Common coding patterns that can reintroduce this issue:
  - `for await` loops with heavy per-chunk synchronous parsing and no cooperative yield.
  - Multiple concurrent SSE streams to the same origin without a client-side limiter.
  - React pages subscribing to full stores and performing expensive `JSON.stringify`/derived computations each update.
  - Streaming progress updates written to global stores at high frequency without strict need.

## 6.2 Persistence & UX Guardrails (2026-02-17)
- `setNovel` must stay debounced; avoid restoring per-keystroke full-session `persist` writes.
- Before switching/deleting sessions, flush pending debounced writes to prevent losing unsaved text.
- Confirmation flows should use Dialog components; avoid reintroducing blocking browser `alert/confirm`.
- Keep session list rows as semantic controls (`button`) for keyboard and assistive-tech compatibility.

## 6.3 Remaining Optimization Opportunities
- Add page lifecycle flush (`visibilitychange` / `pagehide`) for debounced novel persistence to reduce last-keystroke loss risk on abrupt tab close.
- Continue targeted branch testing for `hooks/useStepGenerator.ts`, especially:
  - Phase 0 compression pipeline failure/partial-task branches
  - Phase 3 breakdown meta+chunk orchestration error paths
- Refactor `components/workflow/StepOutline.tsx` into smaller modules to reduce maintenance risk and improve testability.

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

