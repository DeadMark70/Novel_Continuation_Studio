# Implementation Plan: Export Specific Session

## Phase 1: Logic & Utility Updates [checkpoint: f21a8c4]
- [x] Task: Update `lib/utils.ts` to improve `downloadAsTxt` (18fb0ca)
    - [x] Modify `downloadAsTxt` to accept a custom filename or timestamp-based format.
    - [x] Ensure it correctly formats the session content and chapters.
- [x] Task: Verify utility changes with unit tests (18fb0ca)
    - [x] Write/Update tests in `__tests__/utils.test.ts` to cover the new naming convention.

## Phase 2: UI Implementation
- [ ] Task: Modify `HistoryExportDialog.tsx` to add Session Selection
    - [ ] Import `useNovelStore` to access `sessions` and `currentSessionId`.
    - [ ] Implement local state `selectedSessionId` initialized with `currentSessionId`.
    - [ ] Add the `Select` component from `@/components/ui/select`.
    - [ ] Populate the `Select` options with available sessions.
- [ ] Task: Implement Dynamic Statistics Update
    - [ ] Update the "INCLUDED IN EXPORT" section to display stats from the `selectedSession`.
    - [ ] Ensure chapter count and word count reflect the selection.
- [ ] Task: Update Export Execution
    - [ ] Modify `handleExport` to use data from the `selectedSession` instead of global store defaults.
- [ ] Task: Conductor - User Manual Verification 'UI Implementation' (Protocol in workflow.md)

## Phase 3: Verification & Polish
- [ ] Task: Manual Verification
    - [ ] Create multiple sessions with different content/chapters.
    - [ ] Switch between sessions in the Export Tab.
    - [ ] Verify that UI stats update immediately.
    - [ ] Verify that the exported `.txt` file contains the correct session's data.
    - [ ] Verify the filename format: `novel_export_[timestamp].txt`.
- [ ] Task: Automated Testing
    - [ ] Add a component test for `HistoryExportDialog` (if feasible with mocks) or ensure store updates are handled correctly.
- [ ] Task: Conductor - User Manual Verification 'Verification & Polish' (Protocol in workflow.md)
