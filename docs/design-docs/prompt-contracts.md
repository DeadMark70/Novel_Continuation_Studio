# Prompt Contracts

## Why Contracts Exist

Prompt chains fail when intermediate outputs are semi-structured.
Contracts enforce predictable sections so the next phase can consume them safely.

## Core Files

- Prompt templates: `lib/prompts.ts`
- Prompt injection and section splitting: `lib/prompt-engine.ts`
- Contract definitions: `lib/prompt-section-contracts.ts`
- Retry orchestration: `lib/section-retry.ts`
- Analysis tagged parser: `lib/analysis-output.ts`
- Outline parser/sanitizer: `lib/outline-phase2.ts`

## Analysis Contract (Phase 1)

Expected envelope:

- `<analysis_detail>...</analysis_detail>`
- `<executive_summary>...</executive_summary>`

Downstream rule:

- Phase 2 consumes `executive_summary` first.
- If summary missing, fallback to detail text.

## Outline Contract (Phase 2)

Expected headers:

- 2A: objective + high-level beat blueprint
- 2B: tension mechanics + foreshadow plan

Runtime rules:

- sanitize wrapper/preamble noise before reuse
- reject empty 2A when running 2B
- keep skeleton-only constraints in prompt

## Breakdown Contract (Phase 3)

Two-stage contract:

- Meta stage: chapter framework summary + anti-dup rules
- Chunk stage: per-range chapter table output
- Chunk stage additionally requires per-chapter sensory routing hints:
  - `【推薦感官標籤】` (from canonical sensory tag set)
  - `【感官視角重心】` (single POV character or `通用`)

Runtime hardening for noisy Markdown outputs:

- Normalizer (`lib/breakdown-normalizer.ts`) canonicalizes heading/field variants:
  - chapter forms like `### 第五章` -> `【第5章】`
  - field forms like `推薦感官標籤:` -> `【推薦感官標籤】`
- Validator (`lib/breakdown-validator.ts`) rejects broken payloads before persistence:
  - chapter count mismatch for requested range
  - missing/extra chapter numbers
  - omission markers (`以下省略`, `略同`, etc.)
  - likely truncated tail / incomplete last chapter signal
- Retry policy:
  - no automatic second pass after final breakdown validation fails
  - if invalid: fail explicitly (no silent acceptance)

Sensory tag injection strategy (A+B):

- A (prompt-time hint): inject ranked existing tag candidates (`top 30`) into Breakdown chunk prompt.
- Ranking uses:
  - usage frequency (`sensoryTagUsage` log scale)
  - recent usage bonus
  - POV relevance bonus
  - canonical fallback bonus
- B (post-parse fallback):
  - if chapter lacks `推薦感官標籤` or `感官視角重心`, system injects fallback values
  - tags use weighted randomness with cooldown to avoid repeating the same set every chapter
  - repaired metadata is persisted in `breakdownMeta`

## Sensory Harvest Contract

Harvest prompt (`SENSORY_TEMPLATE_HARVEST_PROMPT`) is strict JSON-only and enforces:

- fixed high-quality output size (4 templates)
- canonical sensory tag whitelist only
- `povCharacter` extraction for each candidate
- concrete physical sensation focus (no plot/abstract expansion)
- mandatory `psychologicalShift` for each template
- single-sentence template text with max 65 characters
- strict Traditional Chinese output (JSON keys excluded)

Runtime parser (`lib/sensory-template-harvest.ts`) adds defensive parsing:

- strips fenced code blocks / noisy wrappers
- accepts array payloads and common object wrappers
- rejects simplified Chinese markers, abstract-metaphor markers, and context-dependent phrasing
- rejects missing/invalid `psychologicalShift` length windows and low score candidates
- deduplicates by `text + psychologicalShift` before ranking

## Chapter Generation Anchors (Phase 4)

Phase 4 does not use strict section contracts, but default prompts include hard-priority XML anchors:

- `<chapter_execution_target>`: wraps injected Phase 3 chapter breakdown text.
- `<critical_enforcement>`: locks priority order for chapter progression, style constraints, rhythm, and language purity.

Design intent:

- Keep chapter generation in prose mode while preserving structural control.
- Prevent sensory/style directives from overpowering chapter progression goals.
- Ensure breakdown instructions are marked as high-priority execution target, not background context.
- When auto sensory mapping is enabled, sensory anchors are late-bound at generation time from breakdown chapter hints.

## Retry Policy

- Retries are bounded (default max 2 attempts for enforced contracts).
- On retry, missing section names are echoed back explicitly.
- If still invalid after cap, fail with explicit missing sections.

## Known Gotchas

- Model may prepend preamble like "Here is your output".
- Model may wrap result in fenced code blocks.
- Case/line breaks can vary in XML-like tags.

Handled by:

- case-insensitive extraction
- content sanitization
- strict section validation
