# Tech Debt Tracker

## Usage

- Add one row per debt item.
- Keep `owner`, `impact`, `target milestone` explicit.
- Do not delete closed items; mark status as `closed`.

## Debt Table

| ID | Area | Debt | Impact | Owner | Target | Status |
|---|---|---|---|---|---|---|
| TD-001 | Security | Internal secret gate is not production auth | high | backend | 2026-Q2 | open |
| TD-002 | Prompting | Some prompt templates are still verbose under long context | medium | prompt | 2026-Q1 | open |
| TD-003 | Observability | No first-class telemetry dashboard for phase-level failures | medium | infra | 2026-Q2 | open |
| TD-004 | Mobile UX | App remains desktop-first with limited mobile usability | medium | frontend | 2026-Q2 | open |
| TD-005 | Evaluation | No standardized automatic quality eval harness for chapter outputs | medium | ai-platform | 2026-Q2 | open |

