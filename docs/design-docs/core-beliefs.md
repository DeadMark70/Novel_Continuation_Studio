# Core Beliefs

## 1) Phase > Single Prompt

Long-form continuation quality is more controllable when decomposed:

- Compression
- Analysis
- Outline
- Breakdown
- Chapter generation
- Consistency check

This isolates failure modes and reduces blast radius.

## 2) Structured Outputs Are Mandatory

Unstructured free-form outputs are not reliable enough for chained phases.
The system uses section contracts and retry-on-missing-sections to keep outputs parseable and reusable.

## 3) Skeleton Before Prose

Phase 2 is intentionally skeleton-only.
If outline becomes pre-written prose, later phases lose role clarity and context budget is wasted.

## 4) Budget Safety First

Token preflight checks are a hard guardrail.
Requests that are likely to overflow model context should fail early with actionable feedback.

## 5) Local-First By Default

Drafts and workflow state live in IndexedDB.
This optimizes for fast iteration and low ops overhead for a research prototype.

## 6) Reliability Through Explicit Contracts

Key reliability tools:

- bounded auto-resume rounds
- bounded section retry attempts
- required output sections
- provider capability probing
- abortable run scheduler

## 7) Security Is Layered, Even In Prototype

Current baseline:

- Internal route secret gate (`X-API-Secret`)
- provider key isolation in server routes
- explicit TODO to replace with session/cookie auth for public production

