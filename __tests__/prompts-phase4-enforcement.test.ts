import { describe, expect, it } from 'vitest';
import { DEFAULT_PROMPTS } from '../lib/prompts';

describe('phase 4 prompt enforcement defaults', () => {
  const phase4PromptKeys: Array<
    'chapter1Compressed' | 'chapter1Raw' | 'continuationCompressed' | 'continuationRaw'
  > = ['chapter1Compressed', 'chapter1Raw', 'continuationCompressed', 'continuationRaw'];

  it('contains chapter execution target and critical enforcement blocks', () => {
    for (const key of phase4PromptKeys) {
      const prompt = DEFAULT_PROMPTS[key];
      expect(prompt).toContain('<chapter_execution_target>');
      expect(prompt).toContain('{{CHAPTER_BREAKDOWN}}');
      expect(prompt).toContain('</chapter_execution_target>');
      expect(prompt).toContain('<critical_enforcement>');
      expect(prompt).toContain('</critical_enforcement>');
    }
  });
});

