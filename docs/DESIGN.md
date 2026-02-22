# DESIGN

## Intent

Document architectural design principles and core module boundaries.

## Core Decisions

1. Phase-based generation pipeline instead of single-shot prompt.
2. Structured prompt contracts for machine-usable intermediate outputs.
3. Local-first persistence with metadata/blob split.
4. Provider-agnostic generation path with per-phase routing.
5. Reliability through bounded retries and explicit failure states.

## Pointers

- Architecture map: `ARCHITECTURE.md`
- Design details: `docs/design-docs/index.md`
- DB schema snapshot: `docs/generated/db-schema.md`

