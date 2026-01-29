# Track Specification: Automated Workflow & Prompt System Fix

## Overview
This track focuses on automating the 5-step novel continuation workflow. It aims to create a seamless transition between steps while preserving a critical "User Decision Point" at Step 2 (Outline). Additionally, it addresses the `DEFAULT_PROMPTS is not defined` error currently blocking generation.

## Functional Requirements

### 1. Workflow Automation Logic
- **Sequence Alpha:** Triggering Step 1 (Analysis) will now automatically trigger Step 2 (Outline) upon successful completion.
- **Decision Pause:** The automation will pause at Step 2 to await user input for "Plot Direction".
- **Sequence Beta:** Once the user submits the Step 2 input, the system will automatically proceed to generate the Outline, then trigger Step 3 (Breakdown), and finally Step 4 (Chapter 1) in a continuous sequence.
- **Termination:** The automated sequence ends after Step 4 is completed. Step 5 (Continuation) remains manual.

### 2. Step 2 User Interaction (Inline UI)
- The Step 2 (Outline) UI will be enhanced to clearly prompt for user input when reached by automation.
- **UI Behavior:** The Plot Direction text area will be highlighted or focused automatically.
- **Trigger:** A prominent "Generate Outline & Continue" button will resume the automation.

### 3. Bug Fix: Prompt System
- Fix the `DEFAULT_PROMPTS is not defined` error in `hooks/useStepGenerator.ts`.
- Ensure all 5 default prompts are correctly imported and available as fallbacks in the generator hook.

## Acceptance Criteria
- [ ] Starting Step 1 automatically opens and prepares Step 2.
- [ ] The system waits at Step 2 for user input.
- [ ] After Step 2 input, the system automatically completes Steps 2, 3, and 4.
- [ ] The workflow stops at Step 5.
- [ ] Generation no longer crashes with "DEFAULT_PROMPTS is not defined".

## Out of Scope
- Fully automated "One-click" generation from Step 1 to Step 5 (due to the requirement for user direction in Step 2).
- Batch generation of all chapters defined in Step 3.
