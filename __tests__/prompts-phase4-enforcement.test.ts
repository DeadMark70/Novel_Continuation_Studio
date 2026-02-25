import { describe, expect, it } from 'vitest';
import { DEFAULT_PROMPTS, SENSORY_STYLE_GUIDE } from '../lib/prompts';

describe('phase 4 prompt enforcement defaults', () => {
  const phase4PromptKeys: Array<
    'chapter1Compressed' | 'chapter1Raw' | 'continuationCompressed' | 'continuationRaw'
  > = ['chapter1Compressed', 'chapter1Raw', 'continuationCompressed', 'continuationRaw'];

  const BANNED_WORDS = ['海嘯般', '浪潮', '電流', '無形的威壓洗禮', '彷彿', '如同'];

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

  it('enforces quantitative sentence-length and dash limits in all phase 4 prompts', () => {
    for (const key of phase4PromptKeys) {
      const prompt = DEFAULT_PROMPTS[key];
      expect(prompt).toContain('65 字');
      expect(prompt).toContain('每個段落最多只能出現 1 次破折號');
    }
  });

  it('includes consistent banned-word list in all phase 4 prompts', () => {
    for (const key of phase4PromptKeys) {
      const prompt = DEFAULT_PROMPTS[key];
      for (const word of BANNED_WORDS) {
        expect(prompt).toContain(word);
      }
    }
  });

  it('SENSORY_STYLE_GUIDE enforces quantitative sentence limit and same banned-word list', () => {
    expect(SENSORY_STYLE_GUIDE).toContain('65 字');
    expect(SENSORY_STYLE_GUIDE).toContain('絕對禁止');
    expect(SENSORY_STYLE_GUIDE).toContain('強烈且具體的心理變化');
    for (const word of BANNED_WORDS) {
      expect(SENSORY_STYLE_GUIDE).toContain(word);
    }
  });
});

