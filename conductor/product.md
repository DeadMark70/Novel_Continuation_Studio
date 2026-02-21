# Product Definition

## Project Overview
- Name: Novel Continuation Studio (NCS)
- Type: Local-first Next.js web app
- Goal: Continue long-form novels using a structured Phase 0-5 workflow with per-phase provider/model control.
- Core principle: high control and reproducibility without clutter.

## Current Product Shape (2026-02-21)
1. Provider architecture
- Dual provider support: NVIDIA NIM + OpenRouter.
- Per-phase routing: each phase can select its own `{ provider, model }`.
- Generation config supports provider defaults plus per-model overrides.
- Lore extraction now uses dedicated phases:
  - `loreExtractor` for initial extraction
  - `loreJsonRepair` for optional second-pass JSON repair.

2. Workflow
- Phase 0: optional compression pipeline for long novels.
- Phase 1-5: analysis -> outline -> breakdown -> chapter1 -> continuation. (Phase 0-4 results survive page refresh).
- Global generation lock to prevent concurrent conflicting runs.

3. Settings
- `/settings` is the primary configuration page.
- Includes:
  - Provider credentials and default model selection
  - Phase routing (phase-specific provider/model)
  - Model parameter defaults and per-model override controls
  - Prompt template editor with grouped navigation
  - Context/compression controls
  - Lore extraction and JSON-repair phase routing/parameters
- Save behavior uses single snapshot persistence to improve performance and reduce long save latency.

4. Lorebook Extraction
- `/lorebook` supports character/world card creation and editing.
- "Extract from Text" supports:
  - Extraction target selection: single character, multiple characters, world/lore.
  - Character source mode:
    - `autoDetect`
    - `manualList` (strictly keep only requested names and preserve user order).
- Parse resilience:
  - local JSON auto-repair for malformed punctuation/escapes,
  - retry parse workflow with editable raw output,
  - optional LLM JSON repair phase (`loreJsonRepair`) when parsing fails.
5. History & Reading
- `/history` provides reading room, version history, and TXT export.
- User can return to studio directly from history.

## Recent Hardening (2026-02-17)
- Stability:
  - Resilience E2E Flow A was updated to match current outline action copy and section-contract behavior.
  - `currentStepId` now rejects invalid runtime values before mutating workflow state.
- Performance:
  - `setNovel` persistence switched to debounce-based writes to reduce long-text input I/O amplification.
  - Core workflow panels now use selector subscriptions to avoid broad re-render fan-out during streaming.
- UX & Accessibility:
  - Blocking browser dialogs were replaced with in-app Dialog confirmation patterns.
  - Version history rows are now keyboard-operable controls with explicit labels.
- Platform:
  - Removed `next/font/google` runtime dependency; build no longer depends on external font fetch.
  - Added first-party `error` and `not-found` pages for better failure/404 handling.

## Optimization Backlog (Post-2026-02-17)

- Persistence durability:
  - Debounced `setNovel` writes are flushed on session switch/delete, but abrupt tab close can still lose the final buffered keystrokes.
  - Candidate improvement: flush on `visibilitychange`/`pagehide` and document expected last-keystroke guarantees.
- Test depth:
  - `useStepGenerator.ts` coverage improved but remains moderate; Phase 0 compression pipeline and Phase 3 breakdown chunk orchestration still need targeted branch tests.
- Component complexity:
  - `StepOutline.tsx` remains large and mixed-responsibility (inputs, pacing controls, retry/resume logic, rendering states).
  - Candidate improvement: split into smaller presentational subcomponents plus a state/controller hook.

## Model Configuration Semantics
- Effective config resolution order:
  1. Phase routing (`phaseConfig[phase]`)
  2. Provider defaults (`providerDefaults[provider]`)
  3. Model override (`modelOverrides[provider][model]`)
- Supported parameter set includes:
  - `maxTokens`, `temperature`, `topP`, `topK`
  - `frequencyPenalty`, `presencePenalty`, `seed`
  - `thinkingEnabled`, `thinkingBudget` (provider/model dependent)

## Persistence
- IndexedDB (Dexie) schema v13 stores:
  - Active provider
  - Provider-scoped settings (apiKey, selectedModel, recentModels, parameter support)
  - Phase config
  - Provider defaults
  - Model overrides
  - Custom prompts
  - Context/compression settings
  - Lorebook cards (`character`/`world`) per novel session

## Environment & Cost Safety
- Env keys:
  - `NIM_API_KEY`
  - `OPENROUTER_API_KEY`
  - optional `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME`
- OpenRouter network calls are intentionally blockable with:
  - `E2E_MODE=offline` or
  - `OPENROUTER_DISABLE_NETWORK=1`
- Default team practice: prefer NIM for routine testing to avoid paid usage.

## UX Direction
- Visual style: Noir Industrial command center.
- Priorities:
  - High signal status feedback
  - Dense but readable controls
  - Fast transitions and explicit state indicators

## Acceptance Baseline
- Core checks:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm test`
  - `npm run e2e` (smoke)
- Smoke baseline currently validates home/settings/history critical navigation and dirty-save behavior.
- **Resilience Standard**: Critical user flows (Phase 0 -> Phase 1) must survive simulated API 504/401 errors with clear status feedback.

## Prompt Sources
- Canonical prompt templates live in `lib/prompts.ts`.
- Settings prompt editor writes only overrides; defaults remain source of truth.

