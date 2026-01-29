# Implementation Plan: Automated Workflow & Prompt System Fix

## Phase 1: Prompt System Fix & Centralization [checkpoint: b5717a6]
- [x] Task: Centralize Prompt Definitions 1c57f66
    - [x] Identify `DEFAULT_PROMPTS` location (currently hardcoded in `SettingsPanel.tsx`)
    - [x] Create `lib/prompts.ts` to host centralized prompt templates
    - [x] Update `components/SettingsPanel.tsx` to import from `lib/prompts.ts`
    - [x] Update `hooks/useStepGenerator.ts` to import `DEFAULT_PROMPTS` and resolve the undefined error
- [x] Task: Conductor - User Manual Verification 'Prompt System Fix & Centralization' (Protocol in workflow.md)

## Phase 2: Workflow Automation Core [checkpoint: 7826c88]
- [x] Task: Update Workflow Store for Auto-Progression f895172
    - [x] Write unit tests in `__tests__/useWorkflowStore.test.ts` for automated step transitions
    - [x] Implement automation logic in `store/useWorkflowStore.ts`:
        - Analysis (Completed) -> Set Current to Outline (Idle)
        - Outline (Completed) -> Set Current to Breakdown (Streaming)
        - Breakdown (Completed) -> Set Current to Chapter 1 (Streaming)
- [x] Task: Conductor - User Manual Verification 'Workflow Automation Core' (Protocol in workflow.md)

## Phase 3: Step 2 UI & Interaction Refinement [checkpoint: 7826c88]
- [x] Task: Enhance StepOutline Component f895172
    - [x] Modify `components/workflow/StepOutline.tsx` to autofocus the "Plot Direction" input when the step becomes active
    - [x] Update the UI to clearly signal that this is a "required decision point" to continue automation
- [x] Task: Conductor - User Manual Verification 'Step 2 UI & Interaction Refinement' (Protocol in workflow.md)


## Phase 4: Integration & Full Flow Validation [checkpoint: d72ad2c]
- [x] Task: Verify End-to-End Automation
    - [x] Test Sequence Alpha: Analysis -> Outline Pause
    - [x] Test Sequence Beta: Outline Submit -> Breakdown -> Chapter 1 Finish
    - [x] Confirm Step 5 remains manual as specified
- [x] Task: Conductor - User Manual Verification 'Integration & Full Flow Validation' (Protocol in workflow.md)
