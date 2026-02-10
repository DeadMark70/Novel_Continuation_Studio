# Specification: Optional Phase 0 Long-Novel Compression

## Overview
Introduce an optional `Phase 0: Compression` step before analysis to make long novel continuation more stable under context limits. The step produces structured artifacts (character cards, style guide, compression outline, evidence pack, final compressed context) for downstream generation.

## Functional Requirements

### 1. Optional Compression Modes
- Add user-configurable `compressionMode`:
  - `auto` (default)
  - `on`
  - `off`
- Add user-configurable `compressionAutoThreshold` (default `20000` characters).
- `auto` behavior:
  - `sourceChars <= threshold`: skip Phase 0
  - `sourceChars > threshold`: run Phase 0

### 2. Compression Artifacts
- Persist these fields per session:
  - `characterCards`
  - `styleGuide`
  - `compressionOutline`
  - `evidencePack`
  - `compressedContext`
  - `compressionMeta` (source/compressed ratio and run metadata)

### 3. Workflow Integration
- Expand workflow steps to:
  - `compression -> analysis -> outline -> breakdown -> chapter1 -> continuation`
- Compression completion should move to analysis automatically.
- If compression is skipped by mode/threshold, workflow still proceeds automatically.

### 4. Prompt Routing
- Downstream prompts should prefer `compressedContext` when compression is active and artifacts exist.
- If compression is skipped/off/unavailable, fallback to original novel content.
- Add compression prompt template with strict output markers:
  - `【角色卡】`
  - `【風格指南】`
  - `【壓縮大綱】`
  - `【證據包】`
  - `【最終壓縮上下文】`

### 5. Settings and UX
- Settings panel must expose:
  - Compression mode selector (`auto/on/off`)
  - Auto threshold input (characters)
  - Chunk size, overlap, evidence count (advanced controls)
- Stepper must render a new `Phase 0: Compression` panel with:
  - Current mode and threshold decision visibility
  - Run/re-run controls
  - Streaming output area

## Non-Functional Requirements
- Backward compatibility for existing sessions without compression fields.
- Database migration must initialize defaults without data loss.
- Existing generation and continuation flows remain stable when compression is disabled.

## Acceptance Criteria
- [ ] Users can choose `auto/on/off` for Phase 0 in settings.
- [ ] Users can customize auto threshold; the runtime decision reflects updated threshold.
- [ ] In `auto`, novels under threshold skip Phase 0; novels above threshold run Phase 0.
- [ ] Compression artifacts persist across reload/session switch.
- [ ] Analysis and later steps use compressed context only when compression is active and available.
- [ ] Legacy sessions load without crashes and keep previous behavior.

## Out of Scope
- Strict semantic equivalence guarantees for compression output.
- New external storage/service; implementation remains local-first with existing data layer.
