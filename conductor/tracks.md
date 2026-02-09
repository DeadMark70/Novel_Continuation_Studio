# Project Tracks

This file tracks all major tracks for the project. Each track has its own detailed plan in its respective folder.

## Latest Track

- `nim_stream_timeout_resilience_20260209` (implemented)
  - Path: `conductor/archive/nim_stream_timeout_resilience_20260209/`
  - Scope:
    - Replace fixed total timeout with inactivity timeout in NIM streaming client.
    - Make timeout failures retryable in generation retry flow.
    - Export route segment `maxDuration` for slow upstream model generations.
    - Add regression tests for timeout + retry recovery behavior.

## Previous Track

- `workflow_customization_nim_compat_20260207` (implemented)
  - Path: `conductor/archive/workflow_customization_nim_compat_20260207/`
  - Scope:
    - Session-persistent workflow customization (`targetStoryWordCount`, `targetChapterCount`)
    - Dynamic prompt placeholders (`{{TARGET_STORY_WORD_COUNT}}`, `{{TARGET_CHAPTER_COUNT}}`)
    - Continuation auto mode driven by target chapter count (no hardcoded `5`)
    - NIM model capability probing + thinking mode compatibility handling
