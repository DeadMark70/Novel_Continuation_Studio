# Specification: Context Optimization

## Overview
Optimize text processing and context management in Novel Continuation Studio to reduce token consumption by 5-15% and improve AI's understanding of long-form content through intelligent preprocessing and truncation strategies.

## Functional Requirements

### 1. Text Preprocessing (Normalization)
- **Whitespace Normalization**: 
  - Compress 3+ consecutive newlines into 2.
  - Trim leading/trailing whitespace from every line.
- **Punctuation Unification**: Convert common full-width symbols to standardized versions to save tokens and improve model consistency.
- **Integration**: 
  - Implement `normalizeNovelText(content: string)` in `lib/utils.ts`.
  - Automatically apply normalization in `store/useNovelStore.ts` whenever a novel is uploaded or set.

### 2. Smart Dual-End Truncation
- **Logic**:
  - Threshold: Configurable (default 800 characters).
  - Strategy: Keep the first X and last X characters (default 400 each), joined by a placeholder `...[中间省略 N 字]...`.
- **Exclusion Rule**: **Chapter 1** will never be truncated to ensure foundational setting/characters are always available to the AI.
- **Integration**: Update `lib/prompt-engine.ts` to apply this logic when generating summaries for context.

### 3. Configuration & UI
- **New Settings Tab**: Add a "Context" or "Optimization" tab to the `SettingsPanel`.
- **Configurable Options**:
  - **Truncation Threshold**: Input field for the character count at which truncation starts.
  - **Dual-End Buffer**: Input field for the amount of text to keep at each end (e.g., 400).
  - **Normalization Toggle**: Option to enable/disable specific normalization rules if needed.

## Non-Functional Requirements
- **Efficiency**: Target 5-15% reduction in token count for long chapters.
- **Persistence**: All optimization settings must persist via `useSettingsStore`.

## Acceptance Criteria
- [ ] Large novel uploads are automatically cleaned of excessive whitespace and unified punctuation.
- [ ] Prompt generation correctly includes the full text for Chapter 1 regardless of length.
- [ ] Chapters exceeding the threshold (e.g., 1000 characters) are truncated to the head/tail segments in the prompt.
- [ ] Users can adjust the threshold in the new Settings tab, and changes take effect immediately on next prompt generation.

## Out of Scope
- Advanced semantic summarization (LLM-based summaries of middle sections).
- Real-time normalization while editing (only applied on "Set/Upload").
