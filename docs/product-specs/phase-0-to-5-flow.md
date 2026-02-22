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

## Phase 4: Chapter Generation

User action:

- Generate `chapter1`, then `continuation`.

Expected outcome:

- Chapter text streaming + final persisted chapter.
- Auto mode can queue further continuation chapters.

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

