# RELIABILITY

## Reliability Objectives

1. Keep runs recoverable after interruption.
2. Prevent known parsing and context overflow failure classes.
3. Keep multi-step execution deterministic enough for debugging.

## Main Reliability Mechanisms

- Run queue + active run tracking (`store/useRunSchedulerStore.ts`)
- Abortable generation requests and interruption states
- Cross-request circuit breaker per provider (`lib/circuit-breaker.ts`)
- Prompt section validation + bounded retries
- Analysis/outline sanitization and dual-output parsing
- Phase 3 breakdown normalization + guarded validation (chapter count/sequence/truncation/omission markers)
- Phase 3 sensory fallback injection for missing tag/POV fields with persisted repair metadata
- Preflight token budget gate with CJK safety buffer
- Phase 4 length auto-resume (bounded) with overlap-trim merge for continuation integrity
- Chapter quality guard scoring (rule-based structure/style/language/pacing diagnostics)

## Error Classes

1. Provider/network errors
2. Contract/format errors
3. Token overflow risks
4. User interruption/cancellation

## Recovery Strategy

- Surface explicit errors with actionable next steps.
- Preserve latest stable artifacts in session storage.
- Allow rerun from failed phase, not full restart.
- When provider failures become consecutive, circuit breaker opens (threshold 3) and cools down for 60s before one half-open trial.
- On generation truncation (`finish_reason=length`) for chapter steps, auto-resume is bounded and merged without duplicated prefix text.
- Phase 3 final validation failures do not auto-retry; system surfaces explicit error and preserves latest stable breakdown content.
- Sensory harvesting errors do not auto-retry; system opens recovery dialog with editable raw output for manual JSON fix and re-parse.

## Operational Checks

- Typecheck + lint + unit tests + e2e on high-impact changes.
- Keep route and generation timeout behavior explicit.
