# Implementation Plan - Conductor Sync & Test Suite Stabilization

## Phase 1: Documentation & Standards
- [x] Task: Update `conductor/product.md` to reflect Session-based novel management system. [043d9da]
- [x] Task: Update `conductor/tech-stack.md` with Zustand mutex locks and Dexie.js v3 schema. [043d9da]
- [x] Task: Update `conductor/workflow.md` with automated progression and error handling protocols. [67619a2]
- [ ] Task: Update `conductor/workflow.md` with automated progression and error handling protocols.
- [x] Task: Create `docs/ENGINEERING_STANDARDS.md` covering Token limits, SSE timeouts, and API error handling. [5a061c5]
- [x] Task: Link `ENGINEERING_STANDARDS.md` from `conductor/tech-stack.md`. [5a061c5]
- [x] Task: Conductor - User Manual Verification 'Documentation & Standards' (Protocol in workflow.md) [checkpoint: 8411a11]

## Phase 2: Core System Fixes (DB & Store)
- [ ] Task: Fix `lib/db.ts` and `__tests__/db.test.ts`
    - [ ] Sub-task: Verify `db.test.ts` failure regarding "Invalid key provided".
    - [ ] Sub-task: Update `lib/db.ts` to correctly handle `sessionId` in `saveNovel`.
    - [ ] Sub-task: Verify all `db.test.ts` tests pass.
- [ ] Task: Fix `store/useWorkflowStore.ts` and `__tests__/useWorkflowStore.test.ts`
    - [ ] Sub-task: Fix circular dependency/module resolution for `useNovelStore` in `useWorkflowStore`.
    - [ ] Sub-task: Ensure safe access to `novelStore` state during sync (fix `Cannot read properties of undefined`).
    - [ ] Sub-task: Verify all `useWorkflowStore.test.ts` tests pass.
- [ ] Task: Conductor - User Manual Verification 'Core System Fixes' (Protocol in workflow.md)

## Phase 3: Frontend & Prompt Engine Fixes
- [ ] Task: Fix `__tests__/VersionList.test.tsx`
    - [ ] Sub-task: Update `lucide-react` mock to include `FileText` icon.
    - [ ] Sub-task: Verify `VersionList` tests pass.
- [ ] Task: Fix `__tests__/prompt-engine.test.ts`
    - [ ] Sub-task: Update assertion logic to match new chapter title prefixing (or fix code if regression).
    - [ ] Sub-task: Verify `prompt-engine` tests pass.
- [ ] Task: Conductor - User Manual Verification 'Frontend & Prompt Engine Fixes' (Protocol in workflow.md)
