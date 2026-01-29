# Implementation Plan: Core Management Features

## Phase 1: Data Access & Versioning Logic [checkpoint: 395926b]
- [x] Task: Extend Database Layer for History Retrieval f992c08
- [x] Task: Enhance Novel Store for History Management 8126a32
- [x] Task: Conductor - User Manual Verification 'Data Access & Versioning Logic' (Protocol in workflow.md)

## Phase 2: UI Foundation & Header Integration [checkpoint: 6a524e1]
- [x] Task: Create Management Dialog Scaffold 55266b3
- [x] Task: Integrate Trigger Button in Header 55266b3
- [x] Task: Conductor - User Manual Verification 'UI Foundation & Header Integration' (Protocol in workflow.md)

## Phase 3: Version History UI Implementation [checkpoint: d3c8471]
- [x] Task: Implement Version List UI e155c5f
- [x] Task: Implement Rollback Interaction a9f3858
- [x] Task: Conductor - User Manual Verification 'Version History UI Implementation' (Protocol in workflow.md)

## Phase 4: Full Story Viewer Implementation
- [x] Task: Implement Side-by-Side Reading Room 70c2920
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
