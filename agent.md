# Agent Handoff: Novel Continuation Studio

## 1. Project Mission
- Build a local-first writing studio that continues long-form novels through a structured 5-step workflow.
- Keep generation controllable, reproducible, and resilient when NVIDIA NIM models behave differently (capabilities, latency, stream stability).

## 2. Current Status (2026-02-09)
- Core workflow and session system are implemented.
- NIM capability governance is implemented (chat/thinking probe + per-model cache).
- Thinking-mode lockout after transient probe failures has been fixed.
- Slow-model timeout resilience has been implemented using inactivity timeout + retry.
- TypeScript and ESLint are passing on the current branch.

## 3. Runtime Stack
- Framework: Next.js App Router (`next@16.1.6`)
- UI: React 19, Tailwind, shadcn/ui, Radix primitives
- State: Zustand (`useWorkflowStore`, `useNovelStore`, `useSettingsStore`)
- Persistence: Dexie / IndexedDB (`lib/db.ts`)
- LLM: NVIDIA NIM SSE streaming through local API routes

## 4. Key Paths
- UI entry: `app/page.tsx`
- Generation pipeline:
  - `hooks/useStepGenerator.ts`
  - `lib/nim-client.ts`
  - `app/api/nim/generate/route.ts`
- Capability governance:
  - `app/api/nim/capabilities/route.ts`
  - `store/useSettingsStore.ts`
  - `lib/thinking-mode.ts`
- Workflow/session state:
  - `store/useWorkflowStore.ts`
  - `store/useNovelStore.ts`
- Prompt engine:
  - `lib/prompt-engine.ts`
  - `lib/prompts.ts`
- Tests: `__tests__/`
- Project governance docs: `conductor/`

## 5. Core State Model
- `useNovelStore`: novel/session content, targets, history.
- `useWorkflowStore`: step statuses, mutex lock (`isGenerating`), automation mode/range.
- `useSettingsStore`: API key, model selection, capability map, thinking toggle.

Invariant:
- Only one generation at a time (`isGenerating` lock).
- Thinking parameters are sent only when effective capability is not explicitly unsupported.

## 6. NIM Reliability Rules (Important)
- Capability states are `supported | unsupported | unknown`.
- `unknown` is treated as optimistic-allowed for thinking attempts.
- Transient probe failures must not be persisted as hard unsupported.
- Streaming timeout is inactivity-based:
  - Thinking requests default: 10 minutes inactivity window.
  - Non-thinking requests default: 5 minutes inactivity window.
- Timeout errors are retryable inside `generateStream`.
- Route handler exports `maxDuration = 300` for platforms that enforce function duration.

## 7. Development Commands
- Install deps: `npm install`
- Dev server: `npm run dev`
- Type check: `npx tsc --noEmit`
- Lint: `npm run lint`
- All tests: `npm test`
- Targeted NIM tests:
  - `npx vitest run __tests__/nim-client.test.ts`
  - `npx vitest run __tests__/nim-capabilities-route.test.ts __tests__/nim-generate-route.test.ts`

## 8. Change Checklist for Future Agents
1. Reproduce issue with targeted test or minimal scenario first.
2. Verify flow from store -> hook -> API route -> upstream response before patching.
3. If modifying capability semantics, update both:
   - decision helpers (`lib/thinking-mode.ts`)
   - UI guardrails (`components/SettingsPanel.tsx`)
4. If modifying stream behavior, update:
   - `lib/nim-client.ts`
   - `__tests__/nim-client.test.ts`
5. Run at minimum:
   - `npx tsc --noEmit`
   - `npm run lint`
   - relevant `vitest` targets
6. Update:
   - `docs/SESSION_CHANGES_YYYYMMDD.md`
   - `conductor/tracks.md`
   - `conductor/archive/<track_id>/` docs when the change is track-sized.

## 9. Active Documentation Anchors
- `docs/SESSION_CHANGES_20260209.md`
- `conductor/tracks.md`
- `conductor/archive/workflow_customization_nim_compat_20260207/`
- `conductor/archive/nim_stream_timeout_resilience_20260209/`
