# Specification: NIM Stream Timeout Resilience

## Overview
Slow NIM models can require long think time and variable inter-chunk latency. A fixed total request timeout can terminate healthy streams. This track hardens the generation pipeline to avoid false timeout failures.

## Functional Requirements

### 1. Inactivity Timeout (Client)
- Replace fixed total timeout with inactivity timeout in `lib/nim-client.ts`.
- Timeout should reset whenever:
  - fetch response is received
  - a stream chunk/read cycle advances
- Keep backward compatibility for existing `timeout` option as alias input.

### 2. Timeout Retry Support
- Treat timeout errors as retryable inside generation retry loop.
- Preserve existing retry backoff behavior.
- Respect user abort signal immediately (must not be masked as timeout retry).

### 3. Route Duration Hint
- Add route segment duration config to `app/api/nim/generate/route.ts`:
  - `export const maxDuration = 300`

### 4. Test Coverage
- Add regression tests for:
  - timeout when no stream activity occurs
  - successful recovery after timeout via retry

## Non-Functional Requirements
- No behavior regression for:
  - capability probe routes
  - non-timeout retry handling
  - user-triggered cancel flow
- Keep TypeScript and lint checks green.

## Acceptance Criteria
- Slow-but-active streams are no longer terminated by fixed total request lifetime.
- Truly inactive requests still fail with `Request timed out`.
- Timeout failures can recover when subsequent retry attempt succeeds.
- Targeted NIM tests pass with timeout scenarios.
