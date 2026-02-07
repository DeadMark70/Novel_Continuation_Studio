# Specification: Workflow Customization + NIM Compatibility Governance

## Overview
This track adds customizable workflow targets and model-aware NIM request behavior.

## Functional Requirements

### 1. Workflow Customization (Session-Persistent)
- Add `targetStoryWordCount` to session state:
  - Default `20000`
  - Valid range `5000-50000`
- Add `targetChapterCount` to session state:
  - Default `5`
  - Valid range `3-20`
- Persist both values in IndexedDB and restore on session load.

### 2. Prompt Variable Injection
- Support `{{TARGET_STORY_WORD_COUNT}}` in outline prompt context.
- Support `{{TARGET_CHAPTER_COUNT}}` in breakdown prompt context.
- Keep outline prompt's `5000-8000` requirement as the outline length requirement.

### 3. Continuation Automation Boundaries
- Remove hardcoded chapter stop checks (`>=5`).
- Use `targetChapterCount` as the stop condition for full auto and range logic.
- Generate range selector options dynamically according to `targetChapterCount`.

### 4. NIM Model Capability Governance
- Add a capability probe route for model support detection:
  - Base chat capability probe.
  - Thinking support probe (`chat_template_kwargs.thinking`).
- Store model capabilities in settings state.
- Expose thinking mode toggle in settings:
  - Always visible.
  - Disabled with reason when unsupported.
- Only send thinking request parameters when the selected model supports them.

## Non-Functional Requirements
- Preserve backward compatibility for older session records (missing new fields).
- Prevent unsupported parameter requests proactively.
- Keep current generation mutex and SSE error handling safeguards intact.

## Acceptance Criteria
- Session customization values survive refresh/session switch.
- Outline prompt includes injected target story word count.
- Breakdown prompt includes injected chapter count.
- Continuation flow stops at configured chapter target.
- Range mode options reflect configured chapter target.
- Unsupported model/thinking combinations are visible in UI and guarded before/at request.
