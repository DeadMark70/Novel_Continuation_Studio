# Implementation Plan: Core Management Features

## Phase 1: Data Access & Versioning Logic
- [x] Task: Extend Database Layer for History Retrieval f992c08
    - [ ] Write tests for fetching historical versions from IndexedDB in `__tests__/db.test.ts`
    - [ ] Implement `getNovelHistory` function in `lib/db.ts`
- [ ] Task: Enhance Novel Store for History Management
    - [ ] Write tests for history-related actions in `__tests__/useNovelStore.test.ts`
    - [ ] Implement `rollbackToVersion` action in `store/useNovelStore.ts` (ensuring non-destructive auto-save of current state)
    - [ ] Implement `loadHistory` action to populate store from DB
- [ ] Task: Conductor - User Manual Verification 'Data Access & Versioning Logic' (Protocol in workflow.md)

## Phase 2: UI Foundation & Header Integration
- [ ] Task: Create Management Dialog Scaffold
    - [ ] Create `components/workflow/HistoryExportDialog.tsx` using `shadcn/ui` Dialog
    - [ ] Implement tabs for "Reading Room", "History", and "Export"
- [ ] Task: Integrate Trigger Button in Header
    - [ ] Modify `app/page.tsx` or relevant layout to add the "History & Export" button
    - [ ] Verify the button correctly opens the dialog
- [ ] Task: Conductor - User Manual Verification 'UI Foundation & Header Integration' (Protocol in workflow.md)

## Phase 3: Version History UI Implementation
- [ ] Task: Implement Version List UI
    - [ ] Write tests for `VersionList` component (mocking store)
    - [ ] Create `components/workflow/VersionList.tsx` showing timestamps and metadata
- [ ] Task: Implement Rollback Interaction
    - [ ] Connect the "Rollback" button to the store's rollback action
    - [ ] Add confirmation dialog before proceeding with rollback
- [ ] Task: Conductor - User Manual Verification 'Version History UI Implementation' (Protocol in workflow.md)

## Phase 4: Full Story Viewer Implementation
- [ ] Task: Implement Side-by-Side Reading Room
    - [ ] Create `components/workflow/ReadingRoom.tsx`
    - [ ] Implement Left Pane for Original Novel with scroll synchronization (optional but nice)
    - [ ] Implement Right Pane for all generated chapters joined together
- [ ] Task: Conductor - User Manual Verification 'Full Story Viewer Implementation' (Protocol in workflow.md)

## Phase 5: Export Protocol Implementation
- [ ] Task: Implement TXT Export Logic
    - [ ] Create utility function in `lib/utils.ts` to format the story as text
    - [ ] Implement download trigger using `Blob` and `URL.createObjectURL`
- [ ] Task: Add Export UI in Dialog
    - [ ] Add the "Download Full Story (.txt)" button to the Export tab
- [ ] Task: Conductor - User Manual Verification 'Export Protocol Implementation' (Protocol in workflow.md)
