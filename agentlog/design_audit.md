# Design & Architecture Audit

## 1. Zustand Store Analysis

### Tight Store Coupling
- **Findings**: `useNovelStore` and `useWorkflowStore` are bi-directionally dependent. `useWorkflowStore` updates `useNovelStore` upon step completion, while `useNovelStore` hydrates `useWorkflowStore` during session loading.
- **Risk**: High. This circular dependency makes unit testing difficult and increases the risk of side effects during state transitions.
- **Evidence**:
    - `useWorkflowStore.completeStep` calling `novelStore.updateWorkflow`.
    - `useNovelStore.loadSession` calling `workflowStore.hydrateFromNovelSession`.

### State Duplication
- **Findings**: Critical workflow data (`analysis`, `outline`, `breakdown`, `chapters`) is duplicated across both stores. 
    - `useWorkflowStore` holds the ephemeral, streaming content.
    - `useNovelStore` holds the persisted, session-wide content.
- **Risk**: Medium. Risk of UI showing stale data if the synchronization in `completeStep` fails or is delayed.

### Hydration & Automation Logic
- **Findings**: Automation logic (auto-triggering next steps) is baked into `useWorkflowStore.completeStep`. It relies on hardcoded `delay()` calls (200ms to 3500ms) to manage state propagation and UX timing.
- **Risk**: Medium. Hardcoded delays are fragile and often mask underlying race conditions. Automation should ideally be handled by a separate controller or effect-based logic.

## 2. IndexedDB & Dexie Analysis

### "Large Document" Pattern
- **Findings**: The `novels` table stores the entire novel content, analysis, outline, breakdown, and chapters in a single record.
- **Performance Impact**: Every call to `persist()` (which happens on every step change, workflow update, etc.) performs a full update of the record. For long novels (100k+ characters), this involves re-writing megabytes of data to IndexedDB, which can lead to UI jank and high latency.
- **Evidence**: `db.novels.update(existing.id, { ...normalizedEntry })` in `lib/db.ts`.

### Schema Versioning (v8)
- **Findings**: The schema is at version 8. It correctly indexes `sessionId` and `updatedAt`.
- **Optimization Opportunity**: Splitting large fields (like `chapters` or the original `content`) into separate tables or "blobs" would significantly improve update performance for metadata-only changes (like updating `currentStep`).

## 3. Summary of Architectural Risks
1. **Race Conditions**: Reliance on `delay()` to ensure `novelStore` state has "propagated" before triggering the next automated step.
2. **Persistence Bottleneck**: Serializing the entire session state to IndexedDB on every minor change.
3. **Complexity of useWorkflowStore**: The store is responsible for too many things: UI state, streaming state, automation logic, and cross-store synchronization.
