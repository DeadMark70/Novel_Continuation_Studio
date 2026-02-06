# Implementation Plan: Context Optimization

This plan focuses on implementing text normalization and smart dual-end truncation to optimize token usage and context management.

## Phase 1: Core Utilities & State Management [checkpoint: 847b25a]
Implement the foundational text processing logic and integrate it into the novel storage flow.

- [x] **Task: Implement `normalizeNovelText` Utility** (18ace1e)
    - [x] Create TDD tests in `__tests__/utils.test.ts` for whitespace compression and punctuation unification.
    - [x] Implement `normalizeNovelText` in `lib/utils.ts`.
    - [x] Verify all tests pass and coverage is >90%.
- [x] **Task: Integrate Normalization into `useNovelStore`** (ae23481)
    - [x] Update `__tests__/useNovelStore.test.ts` to expect normalized text.
    - [x] Modify `setNovel` in `store/useNovelStore.ts` to call `normalizeNovelText`.
    - [x] Verify persistence still works as expected.
- [ ] **Task: Conductor - User Manual Verification 'Phase 1: Core Utilities & State Management' (Protocol in workflow.md)**

## Phase 2: Configuration UI
Add the new "Context" settings tab and relevant state variables.

- [x] **Task: Update `useSettingsStore` for Context Settings** (e7879e5)
    - [x] Add `truncationThreshold` (default 800) and `dualEndBuffer` (default 400) to `useSettingsStore.ts`.
    - [x] Update tests in `__tests__/useSettingsStore.test.ts`.
- [x] **Task: Implement Context Tab in `SettingsPanel`** (1e79a99)
    - [x] Create `__tests__/SettingsPanel.test.tsx` (or update existing) to verify new tab rendering.
    - [x] Add the "Context" tab to `components/SettingsPanel.tsx` with input fields for threshold and buffer.
    - [x] Ensure settings are correctly bound to the store and saved.
- [ ] **Task: Conductor - User Manual Verification 'Phase 2: Configuration UI' (Protocol in workflow.md)**

## Phase 3: Smart Truncation Logic
Implement the dual-end truncation in the prompt generation engine.

- [ ] **Task: Implement Dual-End Truncation in Prompt Engine**
    - [ ] Update `__tests__/prompt-engine.test.ts` with test cases for:
        - Small chapters (no truncation).
        - Large chapters (dual-end truncation with placeholder).
        - Chapter 1 (never truncated).
    - [ ] Modify `lib/prompt-engine.ts` (specifically `injectPrompt` or summary generation logic) to use the new settings and truncation rules.
- [ ] **Task: Verify End-to-End Workflow**
    - [ ] Run full test suite `npm test` to ensure no regressions in prompt generation.
    - [ ] Verify token efficiency manually by inspecting generated prompts in the console or debug logs.
- [ ] **Task: Conductor - User Manual Verification 'Phase 3: Smart Truncation Logic' (Protocol in workflow.md)**
