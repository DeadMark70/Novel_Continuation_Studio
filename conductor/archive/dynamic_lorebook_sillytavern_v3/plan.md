# Implementation Plan: Dynamic Lorebook & SillyTavern V3 Export

## Phase 1: Data Layer & Types

- [x] Task: Install Dependencies
  - [x] `npm install png-chunks-extract png-chunk-text png-chunks-encode`
  - [x] `npm install -D @types/png-chunks-extract @types/png-chunk-text @types/png-chunks-encode`
- [x] Task: Define TypeScript Types
  - [x] Create `lib/lorebook-types.ts`
  - [x] Define V2 and V3 interface structures (`nickname`, `assets`, `group_only_greetings` etc.)
  - [x] Write tests for interface compliance (`__tests__/lorebook-types.test.ts`)
- [x] Task: Update Database Schema
  - [x] Update `lib/db.ts` to add `lorebook` table to `NovelDB`
  - [x] Update Dexie schema version
  - [x] Write tests for basic CRUD operations on `lorebook` table (`__tests__/db-lorebook.test.ts`)
- [x] Task: Conductor - User Manual Verification 'Phase 1: Data Layer & Types' (Protocol in workflow.md)

## Phase 2: AI Extraction Pipeline

- [x] Task: Configure LLM Prompts
  - [x] Add `LORE_EXTRACTION_PROMPT` to `lib/prompts.ts`
- [x] Task: Implement Extraction Logic
  - [x] Create `lib/lore-extractor.ts` to call `llm-client.ts`
  - [x] Add JSON parsing and validation logic (strip markdown blocks)
  - [x] Write unit tests with mocked LLM responses (`__tests__/lore-extractor.test.ts`)
- [x] Task: Conductor - User Manual Verification 'Phase 2: AI Extraction Pipeline' (Protocol in workflow.md)

## Phase 3: Lorebook UI Presentation

- [x] Task: State Management
  - [x] Create `store/useLorebookStore.ts` using Zustand
  - [x] Write unit tests for store actions (`__tests__/useLorebookStore.test.ts`)
- [x] Task: Navigation & Layout
  - [x] Add "Lorebook" link to main application Header/Navigation
  - [x] Create `app/lorebook/page.tsx`
- [x] Task: Build Core UI Components
  - [x] Create `components/lorebook/CardList.tsx`
  - [x] Create `components/lorebook/CardEditor.tsx` (Handle standard fields and manual extraction trigger)
  - [x] Implement image upload utilizing `FileReader` to Base64 conversions
- [x] Task: Conductor - User Manual Verification 'Phase 3: Lorebook UI Presentation' (Protocol in workflow.md)

## Phase 4: Export Engine

- [x] Task: PNG Steganography Core
  - [x] Create `lib/sillytavern-export.ts`
  - [x] Implement `buildV2Payload` and `buildV3Payload`
  - [x] Verify test payloads correctly assemble JSON (`__tests__/sillytavern-export.test.ts`)
- [x] Task: Integration
  - [x] Implement logic to read PNG array buffers, write `chara` and `ccv3` tEXt chunks, and encode to Blob
  - [x] Wire the Export functions to the `CardEditor` or `CardList` UI trigger
- [x] Task: Conductor - User Manual Verification 'Phase 4: Export Engine' (Protocol in workflow.md)
