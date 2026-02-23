# 2026 Q1: Context And Outline Tightening

Status: active  
Owner: engineering  
Last updated: 2026-02-22

## Objective

Improve phase quality and latency predictability by tightening context control and outline skeleton enforcement.

## Work Items

1. Prompt compaction pass for long context phases.
2. Add stricter 2A/2B depth and token hints where useful.
3. Expand contract coverage for any unguarded prompt templates.
4. Add regression tests for malformed preamble/code-fence outputs.
5. Track preflight budget reject rate and tune thresholds.
6. Sensory harvest hardening:
   - canonical tag whitelist only
   - `povCharacter` extraction and persistence
   - score/tag gate before template storage
7. Breakdown sensory routing hints:
   - require `【推薦感官標籤】`
   - require `【感官視角重心】`
8. Phase 4 auto sensory mapping:
   - late-bound mapping from breakdown + template library
   - cross-chapter cooldown memory to reduce immediate repetition
   - zero-template safe fallback (no run interruption)
9. UX/manual override alignment:
   - auto mapping default on
   - manual sensory edits automatically switch to manual override mode

## Success Metrics

- Lower average tokens for phase 2 requests.
- Reduced section-contract failure rate.
- No regression in chapter coherence scores (manual eval set).
- Reduced sensory template tag pollution and POV mismatch incidents (manual QA checklist).
- No chapter-generation failure caused by empty sensory template inventory.

## Risks

- Over-constraining outline can reduce creativity.
- Too aggressive compaction can remove needed narrative anchors.

## Exit Criteria

- All work items completed with passing tests.
- Reliability and quality docs updated.
