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

  it('injects erotic pack placeholder', () => {
    const template = 'Erotic: {{EROTIC_PACK}}';
    const result = injectPrompt(template, { eroticPack: 'TagA, TagB' });
    expect(result).toBe('Erotic: TagA, TagB');
  });

  it('injects previous chapters', () => {
    const template = 'Prev: [插入前面所有已生成的章節]';
    const result = injectPrompt(template, { previousChapters: ['Ch1', 'Ch2'] });
    const expected = 'Prev: 【第 1 章】\nCh1\n\n---\n\n【第 2 章】\nCh2';
    expect(result).toBe(expected);
  });

  it('optimizes context for more than 2 chapters', () => {
    const template = 'Prev: {{GENERATED_CHAPTERS}}';
    const longText = 'A'.repeat(1000);
    const result = injectPrompt(template, { 
      previousChapters: ['Ch1', longText, 'Ch3', 'Ch4'] 
    });
    
    // Chapter 1 should be full
    expect(result).toContain('【第 1 章 - 完整】');
    expect(result).toContain('Ch1');

    // Chapter 2 should be summarized (dual-end)
    expect(result).toContain('【第 2 章 - 摘要】');
    expect(result).toContain('A'.repeat(400));
    expect(result).toContain('...[中間省略 200 字]...');
    
    // Chapters 3 & 4 should be full
    expect(result).toContain('【第 3 章 - 完整】');
    expect(result).toContain('Ch3');
    expect(result).toContain('【第 4 章 - 完整】');
    expect(result).toContain('Ch4');
  });

  it('uses smart dual-end truncation for early chapters', () => {
    const template = 'Prev: {{GENERATED_CHAPTERS}}';
    const longText = 'HEAD' + 'M'.repeat(1000) + 'TAIL';
    // Use 4 chapters so Ch2 is an "early" chapter and can be truncated
    const result = injectPrompt(template, { 
      previousChapters: ['Ch1', longText, 'Ch3', 'Ch4'],
      truncationThreshold: 500,
      dualEndBuffer: 100
    });
    
    expect(result).toContain('【第 2 章 - 摘要】');
    expect(result).toContain('HEAD');
    expect(result).toContain('TAIL');
    expect(result).toContain('...[中間省略 808 字]...');
    expect(result).not.toContain('M'.repeat(500)); // Should be truncated
  });

  it('never truncates Chapter 1', () => {
    const template = 'Prev: {{GENERATED_CHAPTERS}}';
    const longText = 'START' + 'M'.repeat(2000) + 'END';
    const result = injectPrompt(template, { 
      previousChapters: [longText, 'Ch2', 'Ch3'],
      truncationThreshold: 500,
      dualEndBuffer: 100
    });
    
    expect(result).toContain('【第 1 章 - 完整】'); // Should NOT be "摘要"
    expect(result).toContain(longText);
    expect(result).not.toContain('...[中間省略');
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

  it('injects target story word count placeholder', () => {
    const template = 'Target: {{TARGET_STORY_WORD_COUNT}}';
    const result = injectPrompt(template, { targetStoryWordCount: 30000 });
    expect(result).toBe('Target: 30000');
  });

  it('injects target chapter count placeholder', () => {
    const template = 'Chapters: {{TARGET_CHAPTER_COUNT}}';
    const result = injectPrompt(template, { targetChapterCount: 7 });
    expect(result).toBe('Chapters: 7');
  });

  it('injects chapter range placeholders for chunked breakdown', () => {
    const template = 'Range: {{CHAPTER_RANGE_START}}-{{CHAPTER_RANGE_END}}';
    const result = injectPrompt(template, { chapterRangeStart: 6, chapterRangeEnd: 10 });
    expect(result).toBe('Range: 6-10');
  });

  it('injects fixed pacing ratio section', () => {
    const template = 'Rules:\n{{PACING_RATIO_SECTION}}';
    const result = injectPrompt(template, {
      targetStoryWordCount: 24000,
      targetChapterCount: 6,
      pacingMode: 'fixed',
      plotPercent: 60,
      eroticSceneLimitPerChapter: 2,
    });
    expect(result).toContain('全書目標配比（固定）');
    expect(result).toContain('60%；親密/色情描寫 40%');
    expect(result).toContain('每章硬限制：親密場景最多 2 場');
  });

  it('injects curve pacing ratio section', () => {
    const template = 'Rules:\n{{PACING_RATIO_SECTION}}';
    const result = injectPrompt(template, {
      targetStoryWordCount: 20000,
      targetChapterCount: 5,
      pacingMode: 'curve',
      curvePlotPercentStart: 80,
      curvePlotPercentEnd: 40,
      eroticSceneLimitPerChapter: 3,
    });
    expect(result).toContain('全書目標配比（曲線升溫）');
    expect(result).toContain('前期（約前 30% 章節）劇情/心理/關係推進 80%');
    expect(result).toContain('後期（約後 30% 章節）劇情/心理/關係推進 40%');
    expect(result).toContain('每章硬限制：親密場景最多 3 場');
  });
});
