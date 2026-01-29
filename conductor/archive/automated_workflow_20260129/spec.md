# Track Specification: Automated Workflow & NIM Integration

## 1. Overview
This track implements the core automated 5-step workflow for novel continuation, integrates the NVIDIA NIM API for generation, and provides a robust settings system for prompt management and API configuration.

## 2. Functional Requirements

### 2.1. 5-Step Automated Workflow
Implement the following sequence using an **Accordion/Collapsible** UI where each step expands as the previous one completes:
1.  **Step 1: Novel Analysis** - Extracts background, characters, and style.
2.  **Step 2: Outline Generation** - Creates a 3-4 segment story arc.
    *   **Guided Injection:** Users can input specific "Plot Directions" or "Notes" before generating this step.
3.  **Step 3: Chapter Breakdown** - Splits the outline into 5-7 chapters.
4.  **Step 4: Chapter 1 Generation** - Writes the first chapter (4000-5000 words).
5.  **Step 5: Continuation** - Generates subsequent chapters with "continue" support.

### 2.2. NVIDIA NIM API Integration
-   **API Client:** Implement a client to communicate with NVIDIA NIM.
-   **Streaming:** Support Server-Sent Events (SSE) for real-time text output.
-   **Model Management:**
    -   **Discovery:** Fetch available models from the NIM API.
    -   **History:** Maintain a "Recent Models" list (last 5 used).
    -   **Manual Input:** Allow users to manually type a model name.
-   **Security:** Store API Key in local `.env` (development) or encrypted local storage (production/UI).

### 2.3. Advanced Settings Panel
A dedicated modal or panel for "Full Control":
-   **Prompt Editor:** View and edit the raw templates for all 5 prompts.
-   **Reset Ability:** Revert any or all prompts to their factory default values.
-   **Global Config:** Manage API Key and default model selection.

### 2.4. Data Persistence
-   Save customized prompts, API settings, and model history to IndexedDB/LocalStorage.
-   Ensure workflow results are saved at each step to prevent data loss.

## 3. Technical Components

### 3.1. Components
-   `WorkflowStepper.tsx`: Accordion-based container for the 5 steps.
-   `StepStepRenderer.tsx`: Individual step logic (Input/Output/Streaming).
-   `SettingsPanel.tsx`: The full control editor for prompts and API.
-   `ModelSelector.tsx`: Dropdown with history and discovery capabilities.

### 3.2. State & Logic
-   `store/useWorkflowStore.ts`: Manages the progress and data of the current workflow.
-   `store/useSettingsStore.ts`: Manages API keys, prompts, and model preferences.
-   `lib/nim-client.ts`: Handles the fetch/streaming logic for NVIDIA NIM.

## 4. Acceptance Criteria
-   Users can successfully run the entire 5-step process from analysis to continuation.
-   Streaming output is visible in the UI during generation.
-   Custom "Plot Directions" in Step 2 are correctly injected into the prompt.
-   API keys can be saved and are used for requests.
-   Prompts can be modified, saved, and successfully reset.
-   The "Recent Models" list updates as different models are used.
