# New User Onboarding

## Goal

Help a first-time user generate a coherent next chapter from an existing novel text with minimal setup friction.

## Primary User Story

As a user, I want to paste my novel context, configure model/provider, and run the phase pipeline so I can get a high-quality continuation chapter.

## Entry Preconditions

- User has at least one provider API key configured.
- Browser allows IndexedDB.

## Main Flow

1. Paste/import novel text.
2. Open settings and pick provider/model route.
3. Optionally configure compression and prompt overrides.
4. Run phases from Compression to Chapter generation.
5. Review chapter output and optionally continue generation.

## Success Criteria

- User reaches at least one generated chapter.
- No blocking auth/network errors.
- Output is persisted in current session.

## Failure Handling

- Missing API key -> explicit error in route/client.
- Context budget risk -> preflight token gate error with guidance.
- Missing structured sections -> retry or explicit validation error.
- interrupted run -> state marked as interrupted and recoverable.

## UX Signals

- Step status badges: idle/streaming/completed/error.
- Context preflight message before generation.
- Clear retry/continue controls for outline and breakdown.

