# Security & Safety Audit

## 1. API Key Handling
- **Client-to-Server**: Keys are passed via the `Authorization: Bearer <key>` header from the frontend to the local Next.js API route. This is safer than passing keys in request bodies.
- **Server-to-Provider**: The API route correctly extracts the key and proxies it to the upstream provider (NIM/OpenRouter).
- **Persistence**: Keys are stored in the browser's IndexedDB via `useSettingsStore`. 
    - **Risk**: Standard for local-first apps, but users on shared machines are at risk if they don't manually clear settings.
    - **Mitigation**: Added a note to recommend "Incognito Mode" or manual reset for shared environments.

## 2. Sensitive Data Leakage
- **Logging Audit**: 
    - `lib/llm-client.ts` and `hooks/useStepGenerator.ts` use `console.log` and `console.warn` for tracking flow. No prompt content or API keys were found in these logs.
    - `app/api/nim/generate/route.ts` logs raw errors: `console.error('Generation error:', error)`.
- **Risk**: Low. Modern `fetch` errors typically don't include the `Authorization` header in the error message, but sanitization is a best practice.

## 3. Network Guards & Cost Safety
- **Findings**: `lib/openrouter-guard.ts` exists and checks for `E2E_MODE=offline` or `OPENROUTER_DISABLE_NETWORK=1`.
- **Issue**: The guard is **not actually called** in the core `generateStream` function in `lib/llm-client.ts`. It appears to be an orphaned utility or only used in specific test setups.
- **Risk**: High for CI/CD. If a smoke test triggers an OpenRouter phase, it will attempt a real network call even if the environment variable is set to block it, potentially incurring costs.

## 4. Input Validation & Injection
- **Findings**: The `injectPrompt` function in `lib/prompt-engine.ts` uses simple string replacement for user notes.
- **Risk**: LLM Prompt Injection. Users can manipulate the "Story Direction" to override system instructions.
- **Mitigation**: This is an inherent risk of LLM apps, but the project uses clear delimiters (`---` or `【...】`) which help model grounding.

## 5. Summary of Security Risks
1. **Orphaned Network Guard**: `OPENROUTER_DISABLE_NETWORK` is not enforced in the production client logic.
2. **Persistence Policy**: Lack of an "Auto-clear keys on session end" option for high-security users.
3. **Error Sanitization**: Server-side logs should explicitly strip sensitive headers if they log error objects.
