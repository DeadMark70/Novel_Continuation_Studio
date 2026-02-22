# QUALITY_SCORE

## Goal

Track practical quality signals for continuation outputs and system behavior.

## Suggested Scorecard

| Dimension | Signal | Method |
|---|---|---|
| Coherence | chapter-to-chapter continuity | manual rubric + sample set |
| Character fidelity | motivation and boundaries preserved | consistency report + spot audit |
| Pacing quality | escalation and release rhythm | phase 2/3 artifact inspection |
| Redundancy control | repeated scene patterns | manual diff + repetition checks |
| Contract validity | missing section rate | section validator stats |
| Reliability | failed run rate | scheduler and API error logs |

## Current State

- Structural validity: guarded by section contracts and retries.
- Context safety: guarded by preflight token budget gate.
- Chapter quality: primarily manual evaluation plus consistency checks.

## Next Up

1. Add repeatable eval set with fixed prompts.
2. Track preflight reject ratio and retry ratio over time.
3. Add lightweight dashboard export from test/eval runs.

