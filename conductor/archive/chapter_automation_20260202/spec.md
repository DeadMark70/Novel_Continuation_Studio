# Specification: Chapter Automation Control (Phase 5)

## Overview
Implement a control system to automate the generation of subsequent chapters (2-5) after Chapter 1 is completed. This provides users with the flexibility to choose between manual control, full automation, or a specific automated range, along with progress tracking and pause/abort capabilities.

## Functional Requirements

### 1. Automation Modes
- **Manual Mode (Default):** The current behavior. The system waits for user confirmation and explicit "Continue" action after each chapter is completed.
- **Full Auto Mode:** Automatically generates all remaining chapters (up to Chapter 5) in sequence without requiring user intervention between chapters.
- **Range Mode:** Automatically generates chapters within a user-defined range (e.g., from Chapter 2 to Chapter 4). 
    - Upon reaching the end of the range, the system stays in "Range" mode but stops further generation, showing a "Range Goal Reached" status.
    - Explicit user interaction is required to proceed beyond the range.

### 2. Control Panel & UI
- **AutoModeControl Component:** Displayed after Chapter 1 is completed and when no generation is active.
    - **Note:** Also displays when automation is stopped/paused mid-way, allowing the user to change mode before continuing.
    - Mode selection via RadioGroup: Manual, Full Auto, Range.
    - Range selector (only visible for "Range" mode): Two dropdowns to select Start and End chapters.
    - "Start Generation" button to initiate the automation sequence.
- **ProgressIndicator Component:** Visible during active generation.
    - Displays current chapter progress (e.g., "Generating Chapter 3/5").
    - Visual progress bar based on chapter count.
- **Interrupt Controls:**
    - "Pause/Stop" button available during generation.
    - Clicking "Pause/Stop" **immediately aborts** the current API request and halts the automation queue. The aborted chapter will need to be regenerated.

### 3. State Management (`useWorkflowStore`)
- New state variables:
    - `autoMode`: `'manual' | 'full_auto' | 'range'`
    - `autoRangeStart`: number (default: 2)
    - `autoRangeEnd`: number (default: 5)
    - `isPaused`: boolean (flag to prevent next chapter from starting)
- New actions:
    - `setAutoMode(mode)`
    - `setAutoRange(start, end)`
    - `pauseGeneration()`: Aborts current generation and sets `isPaused` to true.
    - `resumeGeneration()`: Sets `isPaused` to false and triggers the current step.

### 4. Logic & Error Handling
- **Trigger Logic:** After a chapter is completed in `completeStep`, the store checks `autoMode` and `autoRangeEnd` to decide if the next chapter should be triggered automatically after a short delay (1000ms).
- **Error Handling:** If an API error occurs during automation:
    - Immediately stop the automation.
    - Switch `autoMode` to `'manual'`.
    - Display an error toast/alert.
    - The user must manually retry the current chapter.

### 5. Context Accumulation
- Each chapter generation includes all previously completed chapters in the prompt.
- `{{GENERATED_CHAPTERS}}` placeholder is replaced with:
    - Full text of the last 2 chapters.
    - 500-character summary of earlier chapters (token optimization).

## Acceptance Criteria
- [ ] Control panel appears correctly after Chapter 1 completion and when paused.
- [ ] Manual mode correctly waits for user after each chapter.
- [ ] Full Auto mode generates 2, 3, 4, and 5 sequentially without stopping.
- [ ] Range mode stops correctly at the specified end chapter and shows "Range Goal Reached".
- [ ] Clicking "Pause/Stop" during generation aborts the request and stops the queue.
- [ ] API failures correctly halt automation and switch back to manual mode.
- [ ] Progress bar accurately reflects the chapter being generated.
- [ ] Context sent to API correctly includes full text of last 2 chapters and summaries of earlier ones.

## Out of Scope
- Automatic generation beyond Chapter 5.
- Complex retry logic for API failures.
- Parallel generation of multiple chapters.
