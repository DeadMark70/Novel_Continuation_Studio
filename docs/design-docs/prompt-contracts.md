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

