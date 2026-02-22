# Phase Pipeline

## Contract Table

| Phase | Goal | Primary Inputs | Primary Outputs |
|---|---|---|---|
| 0 Compression | Reduce context while preserving continuity anchors | raw novel text, compression prompts | compressed context, role cards, style guide, plot ledger, evidence pack, erotic pack |
| 1 Analysis | Build actionable continuation map | raw/compressed context + compression artifacts | `<analysis_detail>` + `<executive_summary>` |
| 2A Outline Skeleton | Define continuation objective and high-level beats | analysis summary + context | outline skeleton section A |
| 2B Pacing/Foreshadow | Define tension mechanics and foreshadow plan | sanitized 2A + analysis summary + context | outline skeleton section B |
| 3 Breakdown | Expand to chapter-by-chapter plan | phase 2 output + compression outline | chapter framework |
| 4 Generation | Write chapter prose | all prior phase outputs + generated chapter history | chapter text |
| 5 Consistency | Detect drift and generate regen guidance | latest chapter + prior chapters + artifacts | consistency report, timeline updates, foreshadow updates |

## Phase 2 Special Notes

- 2A and 2B are separate tasks with separate prompts and contracts.
- 2B must consume sanitized 2A only.
- Both enforce skeleton constraints:
  - no dialogue
  - no full scene prose
  - fixed hierarchy depth
  - short sub-item limits

## Breakdown Strategy

- Meta pass first: global chapter distribution and anti-duplication rules.
- Chunk pass next: chapter ranges (batching) to keep each call bounded.

## Generation Strategy

- `chapter1` and `continuation` share shape, differ by chapter context and chapter number.
- Streaming is enabled.
- Auto-resume is possible for truncation but bounded by max rounds.

## Failure Modes

- Missing section headers from model output.
- Token overflow from oversized context.
- Prompt drift from preamble/format noise.
- Over-verbose phase outputs reducing downstream quality.

## Mitigations

- section validator + retry
- preflight token budget gate
- outline content sanitization
- analysis summary extraction for downstream prompts

