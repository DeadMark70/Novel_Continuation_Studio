# Implementation Plan: Optional Phase 0 Long-Novel Compression

This plan introduces a configurable compression stage before analysis while preserving backward compatibility.

## Phase 1: Data Model + Persistence
- [ ] **Task: Extend DB schema for compression fields**
  - [ ] Add compression artifacts and metadata fields to `NovelEntry`.
  - [ ] Add compression settings (`mode`, `threshold`, chunk params) to `SettingsEntry`.
  - [ ] Add migration defaults for existing rows.
- [ ] **Task: Extend stores**
  - [ ] Add compression artifact fields to `useNovelStore`.
  - [ ] Add compression settings fields to `useSettingsStore`.
  - [ ] Persist and initialize all new fields.

## Phase 2: Prompt and Generation Pipeline
- [ ] **Task: Add compression utilities and parsing**
  - [ ] Add runtime decision helper for `auto/on/off`.
  - [ ] Add chunking/sampling helper for long source content.
  - [ ] Parse structured compression output into artifacts.
- [ ] **Task: Integrate generator**
  - [ ] Add `compression` step support in `useStepGenerator`.
  - [ ] Implement skip path for `off` and `auto <= threshold`.
  - [ ] Save compression artifacts + metadata after completion.
- [ ] **Task: Prompt engine updates**
  - [ ] Add compression placeholders and fallback behavior.
  - [ ] Add default compression prompt template.

## Phase 3: Workflow + UI
- [ ] **Task: Add workflow step**
  - [ ] Extend `WorkflowStepId` with `compression`.
  - [ ] Insert compression into stepper order and automation transitions.
- [ ] **Task: Add compression UI**
  - [ ] Add `StepCompression` panel component.
  - [ ] Add mode/threshold visibility and manual run controls.
- [ ] **Task: Settings controls**
  - [ ] Add compression controls in Settings -> Context tab.
  - [ ] Ensure save/load behavior works for all new fields.

## Phase 4: Tests + Validation
- [ ] **Task: Update existing tests**
  - [ ] Adjust workflow/store tests for new initial step and transitions.
  - [ ] Adjust settings tests for new compression fields.
- [ ] **Task: Add targeted tests**
  - [ ] Add tests for compression decision logic (`auto/on/off` + custom threshold).
  - [ ] Add prompt-engine tests for compression placeholders.
- [ ] **Task: Regression validation**
  - [ ] Run full test suite and confirm no behavior regression in continuation flow.
