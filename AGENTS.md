# AGENTS.md

This file is the entry point for AI agents and human contributors.

## Mission

Novel Continuation Studio is a local-first, phase-based long-form writing system.
The project goal is stable chapter continuation with controllable pacing, consistency, and token budget safety.

## Canonical Docs Map

Read in this order:

1. `ARCHITECTURE.md`
2. `docs/DESIGN.md`
3. `docs/SECURITY.md`
4. `docs/RELIABILITY.md`
5. `docs/PLANS.md`

Then use domain folders:

- Design internals: `docs/design-docs/`
- Product behavior: `docs/product-specs/`
- Active execution plans: `docs/exec-plans/active/`
- Completed plans: `docs/exec-plans/completed/`
- Generated truth snapshots: `docs/generated/`
- LLM-friendly references: `docs/references/`

## Source Of Truth Rules

- Runtime logic source of truth: `hooks/`, `lib/`, `store/`, `app/api/`.
- Prompt behavior source of truth: `lib/prompts.ts`, `lib/prompt-engine.ts`, `lib/prompt-section-contracts.ts`.
- Persistence source of truth: `lib/db.ts` and `docs/generated/db-schema.md`.
- If docs and code disagree, code wins. Update docs in same change set.

## System Phases

- Phase 0: Compression
- Phase 1: Analysis
- Phase 2A/2B: Outline skeleton + pacing/foreshadow mechanics
- Phase 3: Breakdown
- Phase 4: Chapter generation (`chapter1`, then `continuation`)
- Phase 5: Consistency check and regeneration guidance

## Hard Constraints

- Keep Phase 2 outputs skeleton-only (not draft prose).
- Keep section contracts strict for structured outputs.
- Enforce token preflight budget before provider calls.
- Keep high-frequency streaming updates out of global render-critical paths.
- Keep API routes protected with internal secret gate for non-public use.

## Update Workflow

When changing behavior:

1. Update code.
2. Update impacted docs:
   - Design rules -> `docs/design-docs/*`
   - Product flow -> `docs/product-specs/*`
   - Reliability/Security -> `docs/RELIABILITY.md`, `docs/SECURITY.md`
3. If data model changed, update `docs/generated/db-schema.md`.
4. If plan state changed, move file between:
   - `docs/exec-plans/active/`
   - `docs/exec-plans/completed/`
5. Append new debt item in `docs/exec-plans/tech-debt-tracker.md` when trade-off is intentional.

## Fast Navigation

- Prompt catalog: `lib/settings-prompt-catalog.ts`
- Retry and validation: `lib/section-retry.ts`, `lib/section-validator.ts`
- Token estimation: `lib/token-estimator.ts`, `workers/tokenizer.worker.ts`
- Generation orchestration: `hooks/useStepGenerator.ts`, `store/useRunSchedulerStore.ts`
- API routes: `app/api/openrouter/generate/route.ts`, `app/api/nim/generate/route.ts`

