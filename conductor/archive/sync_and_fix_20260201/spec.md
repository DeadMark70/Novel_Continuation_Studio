# Specification: Conductor Sync & Test Suite Stabilization

## 1. Overview
This track focuses on synchronizing the Conductor documentation with the latest architectural changes (Session-based history, global mutex locks) and fixing the regressions identified in the test suite. It also establishes a new Engineering Standards document to track known system limits and mitigation strategies.

## 2. Functional Requirements
### 2.1 Documentation Updates
- **Product Definition (`conductor/product.md`)**: Update to reflect the Session-based novel management system.
- **Tech Stack (`conductor/tech-stack.md`)**: 
    - Document the migration to Zustand for global locks (`isGenerating`).
    - Document the IndexedDB schema version 3 (Dexie.js).
- **Workflow (`conductor/workflow.md`)**: Update to include the new automated progression logic and error handling protocols.
- **Engineering Standards (`docs/ENGINEERING_STANDARDS.md`)**: Create a standalone guide detailing:
    - Token limits (Context window constraints).
    - SSE timeout handling (180s logic).
    - API error object detection (HTTP 200 with error body).

### 2.2 Bug Fixes (Test Suite)
- **Database (`lib/db.ts` & `__tests__/db.test.ts`)**: Resolve `TypeError: Invalid key provided` by ensuring `sessionId` is correctly handled during IndexedDB operations.
- **Store Sync (`store/useWorkflowStore.ts`)**: Fix module resolution issues in tests and ensure `novelStore` state is correctly initialized/accessed during sync.
- **UI Mocks (`__tests__/VersionList.test.tsx`)**: Update the `lucide-react` mock to include `FileText` and any other missing icons.
- **Prompt Engine (`__tests__/prompt-engine.test.ts`)**: Fix assertion errors related to the new chapter title prefix logic.

## 3. Non-Functional Requirements
- **Test Integrity**: 100% pass rate for `npm test` after implementation.
- **Documentation Clarity**: All Conductor files must match the actual implementation in `/lib`, `/store`, and `/hooks`.

## 4. Acceptance Criteria
1. `conductor/product.md`, `tech-stack.md`, and `workflow.md` are updated.
2. `docs/ENGINEERING_STANDARDS.md` is created and linked from `tech-stack.md`.
3. `npm test` runs successfully with zero failures.
4. The global mutex lock (`isGenerating`) is properly documented as a requirement for any new generation features.

## 5. Out of Scope
- Implementing new features not mentioned in the recent session changes.
- Upgrading to a different database engine.
