# Actionable Task List & Prioritization

## P0: Critical (Immediate Action Recommended)
1. **Security: Enforce OpenRouter Network Guard**
    - **Issue**: `OPENROUTER_DISABLE_NETWORK` is not enforced in the client-side `generateStream`.
    - **Action**: Add a check in `lib/llm-client.ts` to block requests if the guard is active.
2. **Safety: Server-Side Error Sanitization**
    - **Issue**: API routes log raw error objects which might contain the `Authorization` header.
    - **Action**: Implement a sanitizer in `app/api/nim/generate/route.ts` to strip sensitive headers before logging.

## P1: Important (High Impact/Performance)
3. **Performance: Throttled UI Updates during Streaming**
    - **Issue**: Store updates on every chunk cause excessive React re-renders.
    - **Action**: Implement a 100ms throttle in `useStepGenerator.ts` for updating step content.
4. **Architecture: IndexedDB Schema Optimization**
    - **Issue**: "Large Document" pattern causes high save latency for long novels.
    - **Action**: Decouple `originalNovel` and `chapters` into separate Dexie tables; keep only metadata in the main `novels` record.
5. **Stability: Resolve Workflow State Delays**
    - **Issue**: Reliance on hardcoded `delay()` for state propagation in `useWorkflowStore`.
    - **Action**: Refactor automation triggers to be event-based or reactive to store changes.

## P2: Enhancement (UX/Technical Debt)
6. **UX: Mobile Touch Target Compliance**
    - **Issue**: Buttons are 36px/32px (below the 44px standard).
    - **Action**: Update `components/ui/button.tsx` default size and icon padding.
7. **Tech Debt: Decouple Zustands Stores**
    - **Issue**: Circular dependency between Novel and Workflow stores.
    - **Action**: Introduce a middleware or orchestration hook to handle cross-store hydration.
8. **Polish: Accurate Tokenization**
    - **Issue**: Character-based token estimation is imprecise for non-English text.
    - **Action**: Integrate a tokenizer worker (e.g., `tiktoken`) for reliable context window management.
9. **UI: Punctuation Standard**
    - **Issue**: Inconsistent use of ellipses and quotes.
    - **Action**: Run a lint/replace for `…` and smart quotes across UI components.
