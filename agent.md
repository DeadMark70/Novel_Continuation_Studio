# Agent Handoff: Novel Continuation Studio

## 1. Mission

- Build a local-first novel continuation studio with a structured Phase 0-5 workflow.
- Support provider/model routing per phase while keeping generation deterministic and debuggable.

## 2. Current Status (Latest)

- **Lorebook Extraction & Export (2026-02-21)**:
  - Added `/lorebook` page for managing character and world cards.
  - Implemented SillyTavern V2 and V3 PNG Steganography Export (`lib/sillytavern-export.ts`).
  - Added UI manual trigger for AI Card Extraction parsing from plain text via `loreExtractor` phase routing.
  - Added extraction target selection: `Single Character`, `Multiple Characters`, `World/Lore`.
  - Added character source mode: `autoDetect` / `manualList`.
  - Added strict manual-list behavior for multi-character extraction:
    - only requested names are kept,
    - output order follows user list,
    - alias-aware matching for parenthetical names.
  - Added resilient JSON parsing pipeline:
    - local JSON repair for CJK/full-width punctuation and bad escapes,
    - optional second-pass LLM JSON repair phase (`loreJsonRepair`) wired through Settings.
  - Added Retry Parse fallback in Lorebook UI using the same repair pipeline.
  - Added extraction safety constraints:
    - field length limits aligned with prompt contracts,
    - auto-detect multi-character output capped to 3 cards,
    - generation param clamping for `temperature` and `topP`.
- Dual-provider support is implemented: NVIDIA NIM + OpenRouter.
- Full pages are active:
  - `/settings` for provider config, phase routing, model params, prompt editing, and context controls.
  - `/history` for reading room, version history, and export.
  - `/lorebook` for viewing and extracting dynamic character/world cards.
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
- 2026-02-17 next-wave optimization was completed:
  - Added explicit persistence drain APIs in `useNovelStore`: `hasPendingPersist()` + `flushPendingPersist()`.
  - Added lifecycle flush bridge (`visibilitychange` + `pagehide`) to reduce last-buffered-input loss.
  - Stabilized resilience E2E by extracting analysis section-contract fixture (`e2e/fixtures/analysis-contract.js`).
  - Expanded `useStepGenerator` high-risk coverage (Phase 0/Phase 3 success, failure, and auto-resume branches).
  - Refactored `StepOutline` into controller + presentation modules (`components/workflow/outline/*`).

## 3. Runtime Stack

- Framework: Next.js App Router (`next@16.1.6`)
- UI: React 19, Tailwind CSS v4, shadcn/ui, Radix primitives
- State: Zustand (`useWorkflowStore`, `useNovelStore`, `useSettingsStore`)
- Persistence: Dexie/IndexedDB (`lib/db.ts`, schema v13)
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
- Lore extraction core: `lib/lore-extractor.ts`
- Lore extraction prompts: `lib/prompts.ts` (`getLoreExtractionPrompt`, `getLoreJsonRepairPrompt`)
- Lorebook editor UI: `components/lorebook/CardEditor.tsx`
- E2E smoke tests: `e2e/smoke.spec.js`

## 5. State Model (Important)

- `providers[provider]`: API key, selected model, recent models, parameter support map.
- `phaseConfig[phase]`: explicit `{ provider, model }` selection for each phase.
- `providerDefaults[provider]`: default generation params.
- `modelOverrides[provider][model]`: per-model override params.
- `phaseParamInheritance[phase]`: whether a phase inherits global/model defaults.
- `phaseParamOverrides[phase]`: optional per-phase generation param overrides.
- `getResolvedGenerationConfig(phase)`: effective config resolution entrypoint used by generation flow.

Resolution order:

1. Phase provider/model (`phaseConfig`)
2. Provider default params (`providerDefaults`)
3. Model overrides (`modelOverrides`)
4. Phase param overrides when inheritance is disabled (`phaseParamOverrides`)

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
- Before switching/deleting sessions, flush pending debounced writes (`flushPendingPersist`) to prevent losing unsaved text.
- Keep lifecycle flush mounted (`NovelPersistenceLifecycleBridge`) to best-effort drain pending writes on tab hide/pagehide.
- Confirmation flows should use Dialog components; avoid reintroducing blocking browser `alert/confirm`.
- Keep session list rows as semantic controls (`button`) for keyboard and assistive-tech compatibility.

## 6.3 Remaining Optimization Opportunities

- Add best-effort `beforeunload`/final snapshot strategy only if data-loss incidents persist after lifecycle flush (tradeoff: browser constraints).
- Continue expanding generator tests around less-covered branches (cancellation races, scheduler handoff edge cases, consistency-check fallback).
- Consider splitting `useStepOutlineController` further if future Phase 2 UX rules continue growing.

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

## 10. Continuous Learning Protocol (Self-Improving)

Goal: convert repeated mistakes into explicit repo rules so future agent runs avoid the same failures.

### 10.1 Trigger Events

Run this protocol whenever one of these happens:

- User correction or rejection of output
- Bug/regression discovered after a change
- Flaky test or reliability incident
- Security/privacy review finding
- Performance incident (render freeze, event-loop starvation, large-write lag)

### 10.2 Mandatory Loop

1. Capture: summarize the mistake in one sentence.
2. Classify: identify root class (`prompt`, `state`, `persistence`, `streaming`, `security`, `tests`, `ux`).
3. Generalize: write a prevention rule that applies beyond the single case.
4. Encode: update `agent.md` (and any impacted docs) in the same change set.
5. Verify: add or update a regression test/check whenever feasible.

### 10.3 End-Of-Fix Rule

After every correction, explicitly finish with this action:

`Update your agent.md so you don't make that mistake again.`

If the rule is project-wide, add it to section 12 (`Learned Rules Log`) with date + impact.

## 11. Parallel Session Execution Pattern

Use parallel agent sessions to increase throughput, but keep ownership strict.

### 11.1 Suggested Lanes

- Lane A (Explorer): inspect code/docs, identify scope, collect references.
- Lane B (Implementer): make code changes for one owned file set.
- Lane C (Verifier): run typecheck/tests/e2e and validate acceptance criteria.

### 11.2 Hard Boundaries

- One lane owns one file set at a time; avoid overlapping edits.
- Split work by module boundaries (`hooks/`, `lib/`, `store/`, `app/api/`, `components/`).
- If overlap is unavoidable, stop and reassign ownership before editing.
- Prefer short-lived branches/patches and frequent integration.

### 11.3 Quality Gate Before Merge

- Typecheck/lint/tests for changed scope pass.
- Prompt-contract and token-budget invariants remain intact.
- Any new failure mode has a documented rule + regression coverage.

## 12. Learned Rules Log

Format: `Date | ID | Rule | Why | Enforcement`

- 2026-02-23 | LR-001 | Never use broad Zustand subscriptions in high-frequency render paths. | Prevent rendering freeze during streaming. | Selector-based subscriptions + review check.
- 2026-02-23 | LR-002 | Always flush debounced novel persistence before session switch/delete. | Prevent buffered-input data loss. | `hasPendingPersist()` + `flushPendingPersist()`.
- 2026-02-23 | LR-003 | Keep Phase 2 outputs skeleton-only and sanitize 2A before 2B. | Preserve phase role clarity and context budget. | Prompt contracts + sanitizer.
- 2026-02-23 | LR-004 | Run preflight token budget gating before provider calls. | Prevent predictable context overflow failures. | `lib/token-estimator.ts` gate.
- 2026-02-23 | LR-005 | Every bug fix should add or tighten a regression test when feasible. | Stop repeat failures and hidden drift. | Unit/e2e update in same change.
- 2026-02-23 | LR-006 | In Phase 4, annotate breakdown as explicit execution target and enforce critical priority block. | Prevent prompt-attention hijack by style/sensory directives. | `<chapter_execution_target>` + `<critical_enforcement>` in default chapter prompts.
- 2026-02-23 | LR-007 | Resume-on-length must provide tail prefix and trim overlap when merging. | Prevent duplicated phrasing and broken chapter continuity after truncation. | `buildResumePrompt()` prefix + `mergeResumedContent()`.
- 2026-02-23 | LR-008 | Use rule-based chapter quality diagnostics for soft scoring before adding semantic judges. | Keep scoring deterministic and debuggable. | `chapter-quality-guard` integrated into consistency report.
- 2026-02-24 | LR-009 | Keep Accordion value controlled even when all panels are closed. | Prevent controlled/uncontrolled state flips and runtime warnings during collapse UX. | Use `''` sentinel value for closed state instead of `undefined`.
- 2026-02-24 | LR-010 | In Vitest files, avoid jest-dom-only matchers unless explicitly configured. | Prevent false test regressions from unsupported assertion APIs. | Use attribute/state assertions compatible with current test setup.
