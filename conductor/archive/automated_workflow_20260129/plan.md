# Implementation Plan: Automated Workflow & NIM Integration

## Phase 1: Settings & NIM Integration

- [x] Task: Settings Store & Persistence
    - [ ] Create `store/useSettingsStore.ts`.
    - [ ] Define state: `apiKey`, `selectedModel`, `recentModels`, `customPrompts`.
    - [ ] Implement `persist` using the existing IndexedDB logic.
    - [ ] **TDD:** Write tests for saving/loading settings.

- [x] Task: NVIDIA NIM Client
    - [ ] Create `lib/nim-client.ts`.
    - [ ] Implement `fetchModels()` to discover available models.
    - [ ] Implement `generateStream(prompt, model, apiKey)` using `fetch` and `ReadableStream`.
    - [ ] **TDD:** Mock `fetch` to test API request formatting and stream handling.

- [x] Task: Settings Panel UI
    - [ ] Create `components/SettingsPanel.tsx`.
    - [ ] Implement API Key input (masked).
    - [ ] Implement `ModelSelector` with history/discovery dropdown.
    - [ ] Implement "Prompt Editor" tabs for the 5 prompts with "Reset to Default" buttons.
    - [ ] Add "Save" and "Cancel" actions.

- [~] Task: Conductor - User Manual Verification 'Settings & NIM Integration' (Protocol in workflow.md)

## Phase 2: Workflow State & Logic

- [x] Task: Workflow Store
    - [ ] Create `store/useWorkflowStore.ts` (or extend `useNovelStore`).
    - [ ] Define state for each step's status (idle, streaming, completed, error) and content.
    - [ ] Implement actions: `startStep(stepId)`, `updateContent(stepId, chunk)`, `completeStep(stepId)`.
    - [ ] **TDD:** Test state transitions and data updates.

- [x] Task: Prompt Injection Logic
    - [ ] Create `lib/prompt-engine.ts`.
    - [ ] Implement functions to merge "User Inputs" (e.g., plot direction) into the "Raw Prompt Templates".
    - [ ] **TDD:** Verify that placeholders are correctly replaced.

- [x] Task: Conductor - User Manual Verification 'Workflow State & Logic' [checkpoint: phase2] (Protocol in workflow.md)

## Phase 3: Workflow UI Implementation

- [x] Task: Step 1 (Analysis) & Step 2 (Outline) UI
    - [x] Create `components/workflow/StepAnalysis.tsx`: Simple "Start" trigger.
    - [x] Create `components/workflow/StepOutline.tsx`: Add "Plot Direction" input field (Guided Injection).
    - [x] Connect to `nim-client` to trigger generation.

- [x] Task: Steps 3, 4, & 5 UI
    - [x] Create components for Breakdown, Chapter 1, and Continuation.
    - [x] Implement the "Accordion" layout in `components/WorkflowStepper.tsx`.
    - [x] Ensure "Streaming" state shows a live cursor or typing effect.

- [x] Task: Integration & Polish
    - [x] Integrate `WorkflowStepper` into the main `page.tsx` (replacing the placeholder).
    - [x] Ensure "Stop Generation" button works.
    - [x] Verify persistence: Refreshing page should keep the generated content.

- [x] Task: Conductor - User Manual Verification 'Workflow UI Implementation' [checkpoint: phase3] (Protocol in workflow.md)
