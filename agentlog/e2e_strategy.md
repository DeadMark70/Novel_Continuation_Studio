# E2E Resilience & Multi-Step Strategy

## 1. Critical User Flows (Multi-Step)
Existing tests focus on "Settings". We need to expand to the "Studio" workflow.

### Flow A: The "Speedrun" (Compression -> Analysis -> Outline)
- **Steps**: 
    1. Upload a small novel.
    2. Click "Generate" on Phase 0 (should auto-skip if small).
    3. Verify Phase 1 starts automatically.
    4. Wait for Phase 1 to complete and verify Phase 2 (Outline) becomes active.
- **Verification**: Ensure the "automation chain" doesn't break and state persists between accordion items.

### Flow B: Manual Review & Resume
- **Steps**:
    1. Start a generation.
    2. Click "Stop" mid-stream.
    3. Verify the generation halts and the "isGenerating" lock is released.
    4. Modify the "Plot Direction" and click "Generate" again.
- **Verification**: Ensure the system handles partial outputs and resumes without duplicating content.

## 2. Error Boundary & Resilience Scenarios
Verify the "Noir Industrial" status system handles failure gracefully.

### Scenario A: API Authentication Failure (401)
- **Setup**: Provide an invalid API key in settings.
- **Test**: Attempt a generation.
- **Expected**: An explicit "Authentication failed" or "Invalid API key" message appears in the workflow step, and the global lock is released.

### Scenario B: Network Timeout / 504 Gateway Timeout
- **Setup**: Mock the `/api/*/generate` route to hang or return a 504.
- **Test**: Attempt a generation.
- **Expected**: The step should show a "Request timed out" or "Gateway Timeout" error after the 180s/300s limit, and provide a "Retry" option.

### Scenario C: Rate Limiting (429)
- **Setup**: Mock a 429 response.
- **Expected**: Verify the client's exponential backoff retry logic (`maxRetries = 2`) is triggered before finally showing an error.

## 3. Mobile Fluidity Verification
- **Test**: Set viewport to iPhone 12.
- **Checks**:
    - Verify the "Dashboard" and "Workflow Execution" headers don't overlap.
    - Verify the `h-9` buttons are reachable and not blocked by the bottom browser chrome.
    - Verify text truncation works on long session names in the header.

## 4. Implementation Priorities
1. **Mocking Infrastructure**: Enhance Playwright setup to easily mock SSE streams and error codes.
2. **State Verification**: Add tests that check `IndexedDB` directly after a step completes to ensure the "Source of Truth" is updated.
3. **Cross-Session Resilience**: Close the browser mid-generation, reopen, and verify the step can be resumed from the last saved content.
