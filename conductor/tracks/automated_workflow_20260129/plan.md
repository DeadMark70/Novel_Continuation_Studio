# Implementation Plan: Automated Workflow & Prompt System Fix

## Phase 1: Prompt System Fix & Centralization
- [x] Task: Centralize Prompt Definitions 1c57f66
    - [x] Identify `DEFAULT_PROMPTS` location (currently hardcoded in `SettingsPanel.tsx`)
    - [x] Create `lib/prompts.ts` to host centralized prompt templates
    - [x] Update `components/SettingsPanel.tsx` to import from `lib/prompts.ts`
    - [x] Update `hooks/useStepGenerator.ts` to import `DEFAULT_PROMPTS` and resolve the undefined error
- [ ] Task: Conductor - User Manual Verification 'Prompt System Fix & Centralization' (Protocol in workflow.md)

## Phase 2: Workflow Automation Core
- [ ] Task: Update Workflow Store for Auto-Progression
    - [ ] Write unit tests in `__tests__/useWorkflowStore.test.ts` for automated step transitions
    - [ ] Implement automation logic in `store/useWorkflowStore.ts`:
        - Analysis (Completed) -> Set Current to Outline (Idle)
        - Outline (Completed) -> Set Current to Breakdown (Streaming)
        - Breakdown (Completed) -> Set Current to Chapter 1 (Streaming)
- [ ] Task: Conductor - User Manual Verification 'Workflow Automation Core' (Protocol in workflow.md)

## Phase 3: Step 2 UI & Interaction Refinement
- [ ] Task: Enhance StepOutline Component
    - [ ] Modify `components/workflow/StepOutline.tsx` to autofocus the "Plot Direction" input when the step becomes active
    - [ ] Update the UI to clearly signal that this is a "required decision point" to continue automation
- [ ] Task: Conductor - User Manual Verification 'Step 2 UI & Interaction Refinement' (Protocol in workflow.md)

## Phase 4: Integration & Full Flow Validation
- [ ] Task: Verify End-to-End Automation
    - [ ] Test Sequence Alpha: Analysis -> Outline Pause
    - [ ] Test Sequence Beta: Outline Submit -> Breakdown -> Chapter 1 Finish
    - [ ] Confirm Step 5 remains manual as specified
- [ ] Task: Conductor - User Manual Verification 'Integration & Full Flow Validation' (Protocol in workflow.md)
