# Phase 0 To 5 User Flow

## Intent

Define user-observable behavior for each phase.

## Phase 0: Compression

User action:

- Trigger compression manually or via mode rules.

Expected outcome:

- Compression artifacts are generated and persisted:
  - role cards
  - style guide
  - plot ledger
  - evidence pack
  - erotic pack
  - compressed context

## Phase 1: Analysis

User action:

- Run analysis.

Expected outcome:

- Structured dual output:
  - detailed analysis block
  - executive summary block for downstream use
- Before first token arrives, UI shows preflight progress labels (for example: `正在讀取原文與壓縮成果...`).

## Phase 2A and 2B: Outline

User action:

- Run 2A + 2B or rerun specific task.

Expected outcome:

- 2A outputs continuation skeleton blueprint.
- 2B outputs pacing/tension/foreshadow skeleton tied to 2A.
- Output remains non-prose skeleton format.

## Phase 3: Breakdown

User action:

- Run breakdown.

Expected outcome:

- Chapter plan with progression and anti-dup rules.
- If chapter count is large, output can be composed from chunks.
- System normalizes chapter/field headings before save (for parser stability).
- System validates chapter range completeness and truncation risk; invalid output is retried once.
- If sensory fields are missing, system auto-injects fallback tags/POV and marks this in metadata.
- StepBreakdown shows auto-repair status and chapter-level injected tags in highlighted style.

## Sensory Pipeline Checkpoint (between Phase 3 and Phase 4)

User action:

- Review sensory templates from the global `Sensory Vault`.

Expected outcome:

- Harvesting can run in background across route changes.
- Task status is visible globally (`處理中...` / `已完成`).
- If harvest output fails to parse, system opens recovery dialog (no auto-retry) and allows manual JSON correction.

## Phase 4: Chapter Generation

User action:

- Generate `chapter1`, then `continuation`.

Expected outcome:

- Chapter text streaming + final persisted chapter.
- Auto mode can queue further continuation chapters.
- If generation stops by length, system may auto-resume once to complete the chapter boundary.
- Consistency output includes rule-based chapter quality diagnostics (structure/style/language/pacing) for soft scoring feedback.
- If `autoSensoryMapping` is enabled, sensory anchors are resolved at generation time (late binding) from:
  - chapter-level breakdown sensory tags
  - chapter-level sensory POV focus
  - sensory template library (with cooldown against recently used templates)
- Pre-run diagnostics panel behavior:
  - before generation, UI shows resolved sensory source (`manual` / `auto mapping` / `phase default template` / `none`)
  - diagnostics includes matched tags + POV when auto mapping is selected
  - diagnostics shows fallback reason when auto mapping has no signal and defaults are used
  - diagnostics also shows Phase 3 tag source for current chapter (`模型原生` vs `系統補全`)
- Manual override behavior:
  - editing sensory override fields in UI auto-disables `autoSensoryMapping`
  - turning `autoSensoryMapping` back on keeps manual text but does not inject it unless auto is turned off again
- Zero-template behavior:
  - chapter generation proceeds without interruption when template library is empty
  - sensory focus section is omitted instead of failing the run

## Phase 5: Consistency

User action:

- Run consistency check after chapter generation.

Expected outcome:

- Report with severity, issue categories, and regen prompt draft.
- Timeline and foreshadow ledger updates.

## Completion Definition

Flow is considered successful when:

- At least one new chapter is generated.
- Consistency report is available for that chapter.
- Session can be resumed from persisted state.

## Failure Protection (Cross-Phase)

- If one provider has consecutive final request failures, circuit breaker opens for that provider.
- While circuit is open, new requests fail fast with explicit message instead of repeated retries.
- When Auto Mode is active, circuit-open errors trigger automatic pause to prevent repeated request storms.

## Settings Surface

- Settings now exposes a unified `Phase Center` where each phase can be configured with:
  - provider + model routing
  - per-phase param inheritance toggle
  - per-phase param overrides (temperature, top_p, top_k, penalties, max tokens, thinking flags)
