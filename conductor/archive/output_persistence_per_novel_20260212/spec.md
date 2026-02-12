# Specification: `output_persistence_per_novel_20260212`

## Overview
This track ensures that all phase outputs (Phase 0-4) and Phase 2 manual guidance ("Plot Direction") are correctly persisted in IndexedDB and restored upon page refresh or session switching. This addresses the issue where "everything disappears after F5".

## Functional Requirements
1.  **Phase 0-4 Synchronization:**
    -   Update `useWorkflowStore.completeStep` to synchronize Phase 0 (`compression`) output to `novelStore.compressedContext`.
    -   Ensure all major phase outputs (`analysis`, `outline`, `breakdown`, `compressedContext`) are synced from the workflow store to the novel store immediately upon phase completion.
2.  **State Hydration:**
    -   Fix `useNovelStore.initialize` to call `useWorkflowStore.getState().hydrateFromNovelSession()` with the data retrieved from the database.
    -   Ensure `useNovelStore.loadSession` also correctly hydrates the workflow store when the user switches novels in the History view.
3.  **Manual Guidance Persistence:**
    -   Verify and ensure `outlineDirection` (Phase 2 input) is correctly persisted and re-populated in the UI after a refresh.
    -   Per user preference, saving will be triggered by explicit actions (like starting/completing a step) to avoid excessive database writes while ensuring survival across refreshes.
4.  **Novel Isolation:**
    -   Confirm that all persisted phase data is correctly scoped to the `sessionId` so that different novels maintain independent progress states.
5.  **Phase 5 Exclusion:**
    -   As requested, Phase 5 (`continuation`) persistence will not be modified as it is already managed within the `chapters` array.

## Acceptance Criteria
-   **Refresh Survival:** Run Phase 0 and 1, enter text in Phase 2 direction, then refresh (F5). The page must restore to Phase 2 with Phase 0/1 results visible and the Phase 2 direction text preserved.
-   **Session Switching:** Switch between two different novel sessions in the History page; each should correctly display its own saved phase outputs and manual guidance.
-   **Phase 0 Output:** After Phase 0 completes, the "Combined Output" should be available in the workflow state immediately and persistent in the database.

## Out of Scope
-   Timer-based auto-save (e.g., every 30 seconds).
-   Changes to Phase 5 (`continuation`) persistence logic.
