# Next Wave Optimization Plan (2026-02-17)

## Goal
- Convert post-hardening findings into concrete, low-risk implementation tasks.
- Keep CI stability while incrementally improving reliability, maintainability, and test depth.

## Implementation Status (2026-02-17)
- [x] Item 1 complete.
- [x] Item 2 complete.
- [x] Item 3 complete.
- [x] Item 4 complete.

## Priority Order
1. Page lifecycle flush for debounced novel persistence.
2. Stabilize resilience E2E fixtures against section-contract drift.
3. Expand `useStepGenerator` coverage on Phase 0/Phase 3 risky branches.
4. Refactor `StepOutline` into controller + presentational modules.

---

## 1) Debounced Persistence: Page Lifecycle Flush

### Problem
- `setNovel` is debounced (350ms). Abrupt tab close / page backgrounding may drop last buffered input.

### Implementation
1. Add `flushPendingPersist()` and `hasPendingPersist()` APIs in `useNovelStore` for explicit drain.
2. Add a lightweight client hook (e.g. `hooks/useNovelPersistenceLifecycle.ts`) mounted once in app shell:
   - listen to `visibilitychange`
   - listen to `pagehide`
   - if document hidden or pagehide fired and pending write exists, call `flushPendingPersist()`
3. Keep existing session-switch/delete flush behavior as secondary safeguard.

### Notes
- Use best-effort flush; do not block navigation with sync dialogs.
- Avoid high-frequency listeners doing heavy work; just check pending state and flush once.

### Acceptance Criteria
- On fast typing + immediate tab close simulation, latest content loss rate significantly reduced.
- No regression in typing latency.
- Existing `useNovelStore` tests remain green; add lifecycle-focused tests (mock events + verify flush call).
- Status: done

---

## 2) Resilience E2E Fixture Hardening

### Problem
- Flow A depends on both button copy and analysis section-contract validation.
- Mock outputs that fail contract can produce false negatives.

### Implementation
1. Add shared fixture builder for contract-valid SSE payloads:
   - e.g. `e2e/fixtures/analysis-contract.ts`
2. Replace inline hardcoded strings in resilience tests with fixture helpers.
3. In Flow A:
   - explicitly open target phase panel before asserting button visibility
   - keep selector tolerant to minor copy variants but anchored to current UX.
4. Add brief inline comment explaining section-contract dependency.

### Acceptance Criteria
- `npm run e2e` remains stable (13/13 baseline).
- Future prompt contract adjustments require fixture update in one place only.
- Status: done

---

## 3) `useStepGenerator` Coverage Expansion (Phase 0/Phase 3)

### Problem
- Coverage improved, but complex pipeline branches (compression/breakdown orchestration) still under-covered.

### Implementation
1. Add focused tests for Phase 0 compression:
   - compression skipped path (`compressionMode=off` or auto-skip threshold)
   - partial task failure handling
   - metadata persistence integrity (`compressionMeta.taskStatus`, durations)
2. Add focused tests for Phase 3 breakdown:
   - meta stage success + chunk failure
   - auto-resume length truncation path
   - merged output composition correctness (`composeBreakdownContent`)
3. Use deterministic stream mocks with explicit `onFinish` metadata.

### Acceptance Criteria
- `hooks/useStepGenerator.ts` statements coverage reaches next target band (suggest >=45% first checkpoint).
- New tests cover at least one error branch and one truncation branch per phase.
- Status: done (targeted `useStepGenerator.ts` coverage run: statements 70.91%, branch 44.61%)

---

## 4) `StepOutline` Refactor (Maintainability)

### Problem
- `StepOutline.tsx` currently combines many concerns:
  - domain input controls
  - resume/retry action logic
  - truncation UI states
  - output rendering variants

### Target Design
1. `useStepOutlineController` hook:
   - derives state, actions, clamps, resume/retry behaviors.
2. Presentation components:
   - `OutlineHeaderActions`
   - `OutlineTargetSettings`
   - `OutlinePacingSettings`
   - `OutlineOutputPanels`
3. Keep store interaction centralized in controller; UI components receive plain props.

### Migration Strategy
1. Introduce controller first without changing visible behavior.
2. Extract one subcomponent at a time with snapshot/interaction tests.
3. Remove dead local state and duplicate effect syncs after extraction.

### Acceptance Criteria
- No UX behavior change in existing StepOutline tests.
- `StepOutline.tsx` reduced to orchestration shell.
- New component-level tests verify extracted modules independently.
- Status: done (`StepOutline` moved to controller + extracted modules, existing tests green)

---

## Suggested Delivery Slices

### Slice A (Low risk, high value)
- Item 1 + Item 2.
- Expected impact: data safety + E2E stability.
- Status: complete

### Slice B (Quality depth)
- Item 3.
- Expected impact: better confidence in generator core.
- Status: complete

### Slice C (Structural maintainability)
- Item 4.
- Expected impact: faster iteration and lower regression risk in Phase 2 UX.
- Status: complete

---

## Verification Commands
- `npx tsc --noEmit`
- `npm run lint`
- `$env:CI='true'; npx vitest run`
- `$env:CI='true'; npx vitest run --coverage`
- `npm run e2e`
