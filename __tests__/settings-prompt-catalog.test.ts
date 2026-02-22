import { describe, expect, it } from 'vitest';
import {
  getPromptDescription,
  getPromptLabel,
  PROMPT_GROUPS,
  validateSettingsPromptCatalog,
} from '../lib/settings-prompt-catalog';

describe('settings prompt catalog', () => {
  it('includes Phase 2A/2B prompts in Settings groups', () => {
    const groupedKeys = new Set(PROMPT_GROUPS.flatMap((group) => group.keys));
    expect(groupedKeys.has('outlinePhase2ACompressed')).toBe(true);
    expect(groupedKeys.has('outlinePhase2ARaw')).toBe(true);
    expect(groupedKeys.has('outlinePhase2BCompressed')).toBe(true);
    expect(groupedKeys.has('outlinePhase2BRaw')).toBe(true);
  });

  it('exposes explicit labels/descriptions for Phase 2A/2B prompts', () => {
    expect(getPromptLabel('outlinePhase2ACompressed')).toContain('Phase 2A');
    expect(getPromptDescription('outlinePhase2ACompressed')).toContain('subtask 2A');
    expect(getPromptLabel('outlinePhase2BCompressed')).toContain('Phase 2B');
    expect(getPromptDescription('outlinePhase2BCompressed')).toContain('subtask 2B');
  });

  it('passes catalog validation', () => {
    expect(validateSettingsPromptCatalog()).toEqual([]);
  });
});
