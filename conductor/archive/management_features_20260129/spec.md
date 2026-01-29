# Track Specification: Core Management Features

## Overview
This track introduces essential management tools for the Novel Continuation Studio: a **Full Story Viewer** for side-by-side reading, an **Export Protocol** for downloading the story, and a **Version History UI** for non-destructive rollbacks. These features will be accessible via a new "History & Export" button in the application header.

## Functional Requirements

### 1. Version History UI (Priority)
- **UI:** A sidebar or dedicated panel listing all saved versions of the novel state.
- **Metadata:** Each entry must display a timestamp and ideally the step that triggered the save.
- **Rollback Mechanism:**
    - Selecting a previous version allows the user to restore that state.
    - **Non-destructive:** Before rolling back, the current state is automatically saved as a new version to prevent accidental data loss.
- **Data Source:** Fetch data from IndexedDB (Dexie.js).

### 2. Full Story Viewer
- **UI:** A side-by-side layout.
- **Left Pane:** Displays the "Original Novel" (uploaded text).
- **Right Pane:** Displays all "Generated Chapters" (Chapters 1 to N) in a continuous, scrollable view.
- **Goal:** Provide a comprehensive reading experience to check for consistency and flow.

### 3. Export Protocol
- **Action:** A "Download Full Story" button.
- **Output:** A single `.txt` file.
- **Structure:**
    - [Title/Header]
    - [Original Novel Content]
    - [Separator]
    - [Chapter 1 Content]
    - [Chapter 2 Content] ... and so on.

### 4. Integration
- Add a "History & Export" button to the main header.
- This button should trigger a Dialog or Sheet (shadcn/ui) containing the three features.

## Non-Functional Requirements
- **Performance:** Efficient querying of IndexedDB to avoid UI lag when listing dozens of versions.
- **Aesthetics:** Maintain the "Noir Industrial" and "Refined Functional" design language.
- **UX:** Clear feedback when a rollback or export is successful.

## Acceptance Criteria
- [ ] User can click a "History & Export" button in the header to open the management panel.
- [ ] User can see a chronological list of saved versions with timestamps.
- [ ] User can rollback to a previous version, and the current state is saved before doing so.
- [ ] User can read the original novel and all generated chapters side-by-side.
- [ ] User can download a `.txt` file containing the entire project content.

## Out of Scope
- Exporting to other formats (PDF, DOCX, etc.).
- Direct editing of chapters within the "Full Story Viewer" pane.
- Manual "Save Version" button (system remains auto-save focused for now).
