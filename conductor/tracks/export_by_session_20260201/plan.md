# Implementation Plan: Export Specific Session

## Phase 1: Logic & Utility Updates [checkpoint: f21a8c4]
- [x] Task: Update `lib/utils.ts` to improve `downloadAsTxt` (18fb0ca)
    - [x] Modify `downloadAsTxt` to accept a custom filename or timestamp-based format.
    - [x] Ensure it correctly formats the session content and chapters.
- [x] Task: Verify utility changes with unit tests (18fb0ca)
    - [x] Write/Update tests in `__tests__/utils.test.ts` to cover the new naming convention.

## Phase 2: UI Implementation [checkpoint: 5c09213]
- [x] Task: Modify `HistoryExportDialog.tsx` to add Session Selection (46864df)
    - [x] Import `useNovelStore` to access `sessions` and `currentSessionId`.
    - [x] Implement local state `selectedSessionId` initialized with `currentSessionId`.
    - [x] Add the `Select` component from `@/components/ui/select`.
    - [x] Populate the `Select` options with available sessions.
- [x] Task: Implement Dynamic Statistics Update (46864df)
    - [x] Update the "INCLUDED IN EXPORT" section to display stats from the `selectedSession`.
    - [x] Ensure chapter count and word count reflect the selection.
- [x] Task: Update Export Execution (46864df)
    - [x] Modify `handleExport` to use data from the `selectedSession` instead of global store defaults.
- [x] Task: Conductor - User Manual Verification 'UI Implementation' (Protocol in workflow.md) (5c09213)

## Phase 3: Verification & Polish [checkpoint: e411b9c]
- [x] Task: Manual Verification
    - [x] Create multiple sessions with different content/chapters.
    - [x] Switch between sessions in the Export Tab.
    - [x] Verify that UI stats update immediately.
    - [x] Verify that the exported `.txt` file contains the correct session's data.
    - [x] Verify the filename format: `novel_export_[timestamp].txt`.
- [x] Task: Automated Testing
    - [x] Add a component test for `HistoryExportDialog` (if feasible with mocks) or ensure store updates are handled correctly.
- [x] Task: Conductor - User Manual Verification 'Verification & Polish' (Protocol in workflow.md) (e411b9c)
