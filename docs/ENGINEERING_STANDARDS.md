# Engineering Standards

This document defines the technical constraints, protocols, and best practices for the Novel Continuation Studio.

## 1. AI Generation & Streaming

### 1.1 Global Locks
- **Requirement:** All generation processes MUST check and set the global `isGenerating` mutex in `useWorkflowStore`.
- **Reason:** To prevent concurrent generation requests that could race or duplicate content.
- **Pattern:**
  ```typescript
  const startGeneration = () => {
    if (useWorkflowStore.getState().isGenerating) return;
    useWorkflowStore.getState().setIsGenerating(true);
    try {
      // ... generate ...
    } finally {
      useWorkflowStore.getState().setIsGenerating(false);
    }
  };
  ```

### 1.2 SSE & Error Handling
- **Timeout:** The client must enforce a strict **180-second** timeout for API responses.
- **Error Objects:** The NVIDIA NIM API may return HTTP 200 responses containing error objects in the stream.
- **Detection Logic:**
  ```typescript
  if (json.error) {
    throw new Error(`API Error: ${json.error.message}`);
  }
  ```

### 1.3 Token Management
- **Context Window:** Models have strict limits (e.g., 8k, 32k, or 200k tokens).
- **Optimization:**
  - Only inject the *previous 2 chapters* fully.
  - Use summaries for earlier chapters.
  - **Constraint:** Ensure total prompt size does not exceed `MODEL_CONTEXT_LIMIT - 4000` (reserved for output).

## 2. Database & Persistence

### 2.1 IndexedDB Schema (Dexie.js)
- **Version Control:** Always increment the schema version number when modifying tables.
- **Session ID:** All novel data must be indexed by `sessionId` to support the multi-run history system.
- **Schema v3:**
  ```typescript
  db.version(3).stores({
    novels: '++id, sessionId, title, updatedAt',
    // ...
  });
  ```

## 3. Testing Standards

### 3.1 Mocks
- **Icons:** When testing components with `lucide-react`, ensure all used icons are explicitly exported in the mock.
- **Stores:** Mock Zustand stores to control state isolation between tests.
