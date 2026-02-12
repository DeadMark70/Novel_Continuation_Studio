# Implementation Plan: `output_persistence_per_novel_20260212`

## Phase 1: Core Persistence Logic Fixes
- [x] Task: Synchronize Phase 0 output in `useWorkflowStore.completeStep` 3a08a45
- [x] Task: Implement state hydration in `useNovelStore.initialize` 3a08a45
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Core Persistence Logic Fixes' (Protocol in workflow.md)

## Phase 2: Verification and Refinement
- [x] Task: Add unit tests for `useNovelStore.initialize` hydration
- [x] Task: Add unit tests for Phase 0 completion sync
- [~] Task: Manual verification of "F5" survival
    - Start a novel, run compression/analysis, enter plot direction, refresh page, and confirm all state is restored.
- [ ] Task: Manual verification of session switching
    - Switch between multiple novels in `/history` and confirm each restores its specific `outlineDirection` and phase contents.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Verification and Refinement' (Protocol in workflow.md)
