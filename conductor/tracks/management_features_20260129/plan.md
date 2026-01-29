# Implementation Plan: Core Management Features

## Phase 1: Data Access & Versioning Logic [checkpoint: 395926b]
- [x] Task: Extend Database Layer for History Retrieval f992c08
- [x] Task: Enhance Novel Store for History Management 8126a32
- [x] Task: Conductor - User Manual Verification 'Data Access & Versioning Logic' (Protocol in workflow.md)

## Phase 2: UI Foundation & Header Integration
- [x] Task: Create Management Dialog Scaffold 55266b3
- [x] Task: Integrate Trigger Button in Header 55266b3
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
