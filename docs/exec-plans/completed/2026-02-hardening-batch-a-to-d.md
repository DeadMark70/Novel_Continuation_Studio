# 2026-02 Hardening Batch A To D

Status: completed  
Completed on: 2026-02-22

## Scope

- API route secret gate
- Phase 2A -> 2B dependency tightening
- Analysis dual output parsing
- Section retry integration with retry cap
- Token preflight hard budget gate
- Store selector/a11y/perf improvements

## Outcomes

1. Added internal API secret checks in generate routes.
2. Added skeleton constraints and sanitized 2A reuse for 2B.
3. Added `<analysis_detail>` + `<executive_summary>` parsing path.
4. Enabled bounded section retry (`maxAttempts = 2`) for key phases.
5. Added preflight context budget gate with CJK safety multiplier.
6. Improved render-path store selection and removed hard delay orchestration.

## Validation Snapshot

- Typecheck passed
- Lint passed
- Unit tests passed
- Build passed
- E2E passed

## Follow-Ups

- Replace internal secret approach with session/cookie auth when moving beyond prototype usage.
- Add telemetry for contract retry rates and budget gate hit rates.

