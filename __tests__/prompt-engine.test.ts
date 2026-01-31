import { injectPrompt } from '../lib/prompt-engine';

describe('Prompt Engine', () => {
  it('injects original novel', () => {
    const template = 'Start: [插入小說全文] End';
    const result = injectPrompt(template, { originalNovel: 'Story Content' });
    expect(result).toBe('Start: Story Content End');
  });

  it('injects analysis result', () => {
    const template = 'Analysis: [插入提示詞1的輸出]';
    const result = injectPrompt(template, { analysis: 'Deep Analysis' });
    expect(result).toBe('Analysis: Deep Analysis');
  });

  it('injects outline', () => {
    const template = 'Outline: [插入提示詞2的輸出]';
    const result = injectPrompt(template, { outline: 'Act 1...' });
    expect(result).toBe('Outline: Act 1...');
  });

  it('injects chapter breakdown', () => {
    const template = 'Breakdown: [插入提示詞3的輸出]';
    const result = injectPrompt(template, { breakdown: 'Chapter 1...' });
    expect(result).toBe('Breakdown: Chapter 1...');
  });

  it('injects previous chapters', () => {
    const template = 'Prev: [插入前面所有已生成的章節]';
    const result = injectPrompt(template, { previousChapters: ['Ch1', 'Ch2'] });
    const expected = 'Prev: 【第 1 章】\nCh1\n\n---\n\n【第 2 章】\nCh2';
    expect(result).toBe(expected);
  });

  it('injects user notes before separator', () => {
    const template = 'Context\n---\nInstruction';
    const result = injectPrompt(template, { userNotes: 'Make it darker' });
    expect(result).toContain('【用戶額外指示/劇情走向】');
    expect(result).toContain('Make it darker');
    expect(result).toContain('Context');
    expect(result).toContain('Instruction');
    // Ensure it's before the separator
    expect(result.indexOf('Make it darker')).toBeLessThan(result.indexOf('---'));
  });

  it('appends user notes if no separator', () => {
    const template = 'Just Context';
    const result = injectPrompt(template, { userNotes: 'Add zombies' });
    expect(result).toContain('Just Context');
    expect(result).toContain('Add zombies');
  });
});
