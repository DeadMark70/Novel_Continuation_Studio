# Implementation Plan: Core App & Novel Management

## Phase 1: Project Initialization & Design System

- [x] Task: Initialize Next.js Project
    - [ ] Initialize Next.js project with TypeScript, Tailwind CSS, and ESLint.
    - [ ] Clean up default boilerplate code.
    - [ ] Configure `tsconfig.json` for strict mode (no `any`).

- [x] Task: Install & Configure shadcn/ui
    - [ ] Run `npx shadcn-ui@latest init`.
    - [ ] Configure `components.json` to use the `app` directory and `lib/utils.ts`.
    - [ ] Install core components: `button`, `card`, `textarea`, `input`, `label`, `progress`.

- [x] Task: Implement Noir Industrial Theme
    - [ ] Update `tailwind.config.ts` with the custom color palette (Deep Black, Charcoal, Cyan, Crimson).
    - [ ] Configure global CSS variables for the dark theme.
    - [ ] Create a `ThemeProvider` (if needed) or enforce dark mode in `layout.tsx`.

- [x] Task: Conductor - User Manual Verification 'Project Initialization & Design System' [checkpoint: phase1] (Protocol in workflow.md)

## Phase 2: Core Infrastructure (State & Storage)

- [x] Task: Setup Zustand Store
    - [ ] Install `zustand`.
    - [ ] Create `store/useNovelStore.ts`.
    - [ ] Define the `NovelState` interface (originalNovel, wordCount).
    - [ ] Implement actions: `setNovel`, `reset`.
    - [ ] Write unit tests for the store logic.

- [x] Task: Setup IndexedDB with Dexie
    - [ ] Install `dexie`.
    - [ ] Create `lib/db.ts` (or `storage.ts`) and define the `NovelDatabase` schema.
    - [ ] Implement helper functions: `saveNovel`, `getLatestNovel`.
    - [ ] Write unit tests for database operations (mocking Dexie or using an in-memory adapter).

- [x] Task: Integrate Storage with Store
    - [ ] Update `useNovelStore` to persist changes to IndexedDB.
    - [ ] Implement a hydration mechanism to load data on app start.

- [~] Task: Conductor - User Manual Verification 'Core Infrastructure (State & Storage)' (Protocol in workflow.md)

## Phase 3: Feature Implementation - Novel Management

- [x] Task: Implement StoryUpload Component
    - [ ] Create `components/StoryUpload.tsx`.
    - [ ] Implement a large `Textarea` for direct pasting.
    - [ ] Implement file upload logic (accept `.txt` only).
    - [ ] **TDD:** Write tests for file reading and text input events.
    - [ ] Connect the component to `useNovelStore`.

- [x] Task: Implement NovelStats Component
    - [ ] Create `components/NovelStats.tsx`.
    - [ ] Implement word counting logic (CJK character count support).
    - [ ] Display the count using a "Digital/Terminal" style font.
    - [ ] **TDD:** Write tests for the word counting function.

- [ ] Task: Assemble Main Page
    - [ ] Update `app/page.tsx`.
    - [ ] Create a "Command Center" layout using the components.
    - [ ] Ensure responsive design (mobile-friendly).

- [ ] Task: Conductor - User Manual Verification 'Feature Implementation - Novel Management' (Protocol in workflow.md)
