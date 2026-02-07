# Implementation Plan: Workflow Customization + NIM Compatibility Governance

## Phase 1: Session Model & Persistence
- [x] Add `targetStoryWordCount` and `targetChapterCount` to `NovelState`.
- [x] Add setter actions with clamping.
- [x] Persist/load/reset new fields in `useNovelStore`.
- [x] Upgrade Dexie schema to v4 and backfill defaults for legacy records.

## Phase 2: Prompt Variables & Generation Context
- [x] Add `{{TARGET_STORY_WORD_COUNT}}` and `{{TARGET_CHAPTER_COUNT}}` support in prompt injection.
- [x] Update default prompt templates to use dynamic placeholders.
- [x] Pass new context values through `useStepGenerator`.

## Phase 3: Workflow UI/Logic Customization
- [x] Step 2 UI: target story word count control (`5000-50000`).
- [x] Step 3 UI: target chapter count control (`3-20`).
- [x] Step 5 logic: stop conditions based on `targetChapterCount`.
- [x] Auto mode range options become dynamic and clamped.

## Phase 4: NIM Capability Governance
- [x] Add `/api/nim/capabilities` probe route.
- [x] Extend `/api/nim/generate` to support safe forwarding of optional parameters.
- [x] Add capability model and probe client in `nim-client`.
- [x] Add settings state for `thinkingEnabled` and per-model capabilities.
- [x] Add settings UI for probe + thinking toggle + unsupported reason.
- [x] Add fallback override hook for per-model behavior tuning.

## Phase 5: Tests
- [x] Add/update unit tests for store, DB, prompt injection, workflow logic, and UI behavior.
- [x] Add API route tests for capabilities and generation forwarding.
