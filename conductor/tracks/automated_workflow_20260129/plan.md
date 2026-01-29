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

- [ ] Task: Workflow Store
    - [ ] Create `store/useWorkflowStore.ts` (or extend `useNovelStore`).
    - [ ] Define state for each step's status (idle, streaming, completed, error) and content.
    - [ ] Implement actions: `startStep(stepId)`, `updateContent(stepId, chunk)`, `completeStep(stepId)`.
    - [ ] **TDD:** Test state transitions and data updates.

- [ ] Task: Prompt Injection Logic
    - [ ] Create `lib/prompt-engine.ts`.
    - [ ] Implement functions to merge "User Inputs" (e.g., plot direction) into the "Raw Prompt Templates".
    - [ ] **TDD:** Verify that placeholders are correctly replaced.

- [ ] Task: Conductor - User Manual Verification 'Workflow State & Logic' (Protocol in workflow.md)

## Phase 3: Workflow UI Implementation

- [ ] Task: Step 1 (Analysis) & Step 2 (Outline) UI
    - [ ] Create `components/workflow/StepAnalysis.tsx`: Simple "Start" trigger.
    - [ ] Create `components/workflow/StepOutline.tsx`: Add "Plot Direction" input field (Guided Injection).
    - [ ] Connect to `nim-client` to trigger generation.

- [ ] Task: Steps 3, 4, & 5 UI
    - [ ] Create components for Breakdown, Chapter 1, and Continuation.
    - [ ] Implement the "Accordion" layout in `components/WorkflowStepper.tsx`.
    - [ ] Ensure "Streaming" state shows a live cursor or typing effect.

- [ ] Task: Integration & Polish
    - [ ] Integrate `WorkflowStepper` into the main `page.tsx` (replacing the placeholder).
    - [ ] Ensure "Stop Generation" button works.
    - [ ] Verify persistence: Refreshing page should keep the generated content.

- [ ] Task: Conductor - User Manual Verification 'Workflow UI Implementation' (Protocol in workflow.md)
