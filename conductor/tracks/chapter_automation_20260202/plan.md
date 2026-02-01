# Implementation Plan: Chapter Automation Control (Phase 5)

## Phase 1: Workflow Store Enhancement
- [x] Task: Update `WorkflowState` interface and implement new actions af16889
    - [ ] Add `autoMode`, `autoRangeStart`, `autoRangeEnd`, and `isPaused` to `WorkflowState`.
    - [ ] Implement `setAutoMode`, `setAutoRange`, `pauseGeneration`, and `resumeGeneration`.
- [x] Task: Modify `completeStep` logic for automation a696ae7
    - [ ] **Write Tests:** Create unit tests in `useWorkflowStore.test.ts` to verify auto-triggering logic for 'manual', 'full_auto', and 'range' modes.
    - [ ] **Implement:** Update `completeStep` to check automation settings and set `autoTriggerStepId` after a delay if conditions are met.
- [x] Task: Implement Abort/Pause logic af16889
    - [ ] **Write Tests:** Verify that `pauseGeneration` correctly sets `isPaused` and interacts with the generation mutex.
    - [ ] **Implement:** Ensure `pauseGeneration` can signal the active generation to abort (hooking into `AbortController` if applicable).
- [ ] Task: Conductor - User Manual Verification 'Workflow Store Enhancement' (Protocol in workflow.md)

## Phase 2: Context Accumulation Logic
- [ ] Task: Update Prompt Engine for `{{GENERATED_CHAPTERS}}` optimization
    - [ ] **Write Tests:** Create unit tests in `prompt-engine.test.ts` to verify the "last 2 chapters full + earlier summaries" logic.
    - [ ] **Implement:** Modify `prompt-engine.ts` to process generated chapters according to the 2-chapter full text + 500-char summary rule.
- [ ] Task: Conductor - User Manual Verification 'Context Accumulation Logic' (Protocol in workflow.md)

## Phase 3: UI Implementation
- [ ] Task: Create `AutoModeControl` component
    - [ ] **Write Tests:** Create `AutoModeControl.test.tsx` to verify mode switching and range selection UI.
    - [ ] **Implement:** Build the component using `shadcn/ui` (RadioGroup, Select, Button).
- [ ] Task: Create `ProgressIndicator` component
    - [ ] **Write Tests:** Create `ProgressIndicator.test.tsx` to verify correct percentage calculation and label display.
    - [ ] **Implement:** Build the component using `shadcn/ui` Progress.
- [ ] Task: Integrate into `StepContinuation.tsx`
    - [ ] **Implement:** Update the layout to show `AutoModeControl` when idle and `ProgressIndicator` + Pause button when generating.
- [ ] Task: Conductor - User Manual Verification 'UI Implementation' (Protocol in workflow.md)

## Phase 4: Integration & Error Handling
- [ ] Task: Implement Automation Error Handling
    - [ ] **Write Tests:** Simulate API failure during automation and verify fallback to Manual mode.
    - [ ] **Implement:** Update error catch blocks in `useWorkflowStore` to reset `autoMode` to `'manual'`.
- [ ] Task: End-to-End Verification
    - [ ] **Manual Test:** Verify "Full Auto" from Chapter 2 to 5.
    - [ ] **Manual Test:** Verify "Range" mode (e.g., 2-3) and its stop behavior.
    - [ ] **Manual Test:** Verify immediate abort on "Pause" click.
- [ ] Task: Conductor - User Manual Verification 'Integration & Error Handling' (Protocol in workflow.md)
