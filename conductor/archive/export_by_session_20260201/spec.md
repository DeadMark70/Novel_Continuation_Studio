# Specification: Export Specific Session

## Overview
Enable users to select and export a specific session's content (original novel + chapters) from the Export Tab, rather than being limited to the currently active session. This allows for easier management and backup of different story branches.

## Functional Requirements

### 1. Session Selection UI
-   **Component:** `HistoryExportDialog` (Export Tab).
-   **Element:** Add a dropdown selector (using `components/ui/select`).
-   **Content:** List all available sessions for the current novel.
-   **Item Display:** Show `Session Name` and `Word Count` for each option (e.g., "Session 1 (12,909 words)").
-   **Default State:** The selector defaults to the **Currently Active Session**.

### 2. Export Logic
-   **Action:** Clicking the "Download .txt" button triggers the export for the **Selected Session**.
-   **Data Scope:**
    -   Original Novel Content **from the selected session** (each session maintains its own copy/version of the base content).
    -   Generated Chapters specific to the *selected* session.

### 3. File Naming
-   **Format:** `novel_export_[timestamp].txt`
-   **Example:** `novel_export_20260201-143022.txt` (or similar timestamp format).

### 4. Interface Behavior
-   **Dynamic Update:** The "INCLUDED IN EXPORT" section **SHOULD** dynamically update to reflect the selected session's data:
    -   Chapter count of the selected session.
    -   Word count of the selected session (if displayed).

## Non-Functional Requirements
-   Use standard project UI components (`shadcn/ui`).
-   Ensure responsive design within the dialog.

## Acceptance Criteria
-   [ ] A dropdown appears in the Export Tab listing all sessions.
-   [ ] Changing the dropdown updates the "INCLUDED IN EXPORT" stats (chapter count, etc.) to match the selected session.
-   [ ] Selecting a non-active session and clicking Download results in a file containing that specific session's content and chapters.
-   [ ] The downloaded filename follows the `novel_export_[timestamp].txt` format.
