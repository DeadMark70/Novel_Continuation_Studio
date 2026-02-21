# Project Tracks

This file records major project tracks and their documentation anchors.

## Latest Track

- `lorebook_extraction_reliability_20260221` (implemented)
  - Scope:
    - Add extraction target modes for lore extraction (`singleCharacter`, `multipleCharacters`, `worldLore`).
    - Add manual character-list guided extraction and strict post-parse filtering.
    - Add resilient JSON parsing (CJK punctuation/escape repair) and LLM repair fallback phase.
    - Add batch lore card insertion for multi-character extraction and UI recovery flow (`Retry Parse`).
    - Add coverage for new extraction logic and settings phase expansion (`loreJsonRepair`).
  - Outcome:
    - Lore extraction now routes through configurable phases: `loreExtractor` + `loreJsonRepair`.
    - Manual-list mode returns only requested characters in user-defined order.
    - Auto-detect multiple-character output is capped to top 3 by completeness.
    - Lore field length and generation parameter bounds are enforced in extraction pipeline.

- `next_wave_optimization_plan_20260217` (implemented)
  - Path: `conductor/next_wave_optimization_plan_20260217.md`
  - Scope:
    - Lifecycle flush for debounced persistence.
    - Resilience E2E fixture hardening for section-contract alignment.
    - Additional Phase 0 / Phase 3 generator coverage.
    - `StepOutline` modular refactor.
  - Outcome:
    - Added page lifecycle flush via `visibilitychange/pagehide` + explicit store flush APIs.
    - Centralized resilience analysis mock fixture and restored stable `npm run e2e` 13/13.
    - Expanded `useStepGenerator` risky-branch tests for compression and breakdown paths.
    - Refactored `StepOutline` into controller + extracted presentation modules.

- `maintenance_hardening_review_20260217` (implemented)
  - Scope:
    - Fix resilience E2E drift and restore full `npm run e2e` pass.
    - Reduce streaming-time re-render pressure via selector subscriptions in workflow core components.
    - Switch novel text persistence to debounced writes with session-switch flush guard.
    - Replace blocking browser dialogs with in-app Dialog UX and improve `VersionList` accessibility semantics.
    - Remove Google font runtime dependency for offline-stable build; add `app/error.tsx` and `app/not-found.tsx`.
    - Sync docs to schema v11 and raise `useStepGenerator` high-risk path coverage.

- `provider_routing_settings_history_upgrade_20260211` (implemented)
  - Scope:
    - Add OpenRouter as second provider alongside NIM.
    - Add per-phase provider/model routing (Phase 0-5).
    - Replace modal-centric settings/history UX with full pages (`/settings`, `/history`).
    - Add provider defaults + per-model override model-params pipeline.
    - Expand prompt management UI and context controls on settings page.

- `settings_stability_and_smoke_hardening_20260211` (implemented)
  - Scope:
    - Optimize settings save path using snapshot persistence.
    - Fix prompt draft/default fallback behavior.
    - Add OpenRouter offline guard for E2E and cost safety.
    - Upgrade Playwright smoke checks for stable end-to-end regression coverage.

## Previous Tracks

- `phase0_long_novel_compression_20260210` (implemented)
  - Path: `conductor/archive/phase0_long_novel_compression_20260210/`
  - Scope:
    - Add optional Phase 0 compression before analysis.
    - Add compression controls and downstream compressed-context routing.

- `nim_stream_timeout_resilience_20260209` (implemented)
  - Path: `conductor/archive/nim_stream_timeout_resilience_20260209/`
  - Scope:
    - Inactivity timeout + retry behavior for NIM streaming.

- `workflow_customization_nim_compat_20260207` (implemented)
  - Path: `conductor/archive/workflow_customization_nim_compat_20260207/`
  - Scope:
    - Workflow customization, target placeholders, and NIM capability handling.
\\
