# Project Tracks

This file tracks all major tracks for the project. Each track has its own detailed plan in its respective folder.

## Latest Track

- `workflow_customization_nim_compat_20260207` (implemented)
  - Path: `conductor/archive/workflow_customization_nim_compat_20260207/`
  - Scope:
    - Session-persistent workflow customization (`targetStoryWordCount`, `targetChapterCount`)
    - Dynamic prompt placeholders (`{{TARGET_STORY_WORD_COUNT}}`, `{{TARGET_CHAPTER_COUNT}}`)
    - Continuation auto mode driven by target chapter count (no hardcoded `5`)
    - NIM model capability probing + thinking mode compatibility handling
