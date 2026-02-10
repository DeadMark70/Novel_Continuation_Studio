import { injectPrompt } from '../lib/prompt-engine';

describe('Prompt Engine Automation', () => {
  it('injects new placeholders', () => {
    const template = '{{NOVEL_TEXT}} {{ANALYSIS_RESULT}} {{OUTLINE_RESULT}} {{CHAPTER_BREAKDOWN}}';
    const context = {
      originalNovel: 'Novel',
      analysis: 'Analysis',
      outline: 'Outline',
      breakdown: 'Breakdown'
    };
    const result = injectPrompt(template, context);
    expect(result).toBe('Novel Analysis Outline Breakdown');
  });

  it('injects generated chapters', () => {
    const template = 'Chapters: {{GENERATED_CHAPTERS}}';
    const context = {
      previousChapters: ['C1', 'C2']
    };
    const result = injectPrompt(template, context);
    const expected = 'Chapters: 【第 1 章】\nC1\n\n---\n\n【第 2 章】\nC2';
    expect(result).toBe(expected);
  });

  it('handles user direction sections when present', () => {
    const template = 'Section: {{USER_DIRECTION_SECTION}} Requirement: {{USER_DIRECTION_REQUIREMENT}}';
    const context = {
      userNotes: 'Go dark'
    };
    const result = injectPrompt(template, context);
    expect(result).toContain('Section: **用戶的故事方向偏好：**\nGo dark');
    expect(result).toContain('Requirement: - 特別注意用戶提出的方向偏好，將其自然融入劇情');
  });

  it('clears user direction placeholders when absent', () => {
    const template = 'Section:{{USER_DIRECTION_SECTION}}Requirement:{{USER_DIRECTION_REQUIREMENT}}';
    const result = injectPrompt(template, {});
    expect(result).toBe('Section:Requirement:');
  });

  it('injects next chapter number', () => {
    const template = 'Chapter {{NEXT_CHAPTER_NUMBER}}';
    const result = injectPrompt(template, { nextChapterNumber: 5 });
    expect(result).toBe('Chapter 5');
  });

  it('injects compression placeholders', () => {
    const template = '{{COMPRESSED_CONTEXT}}|{{CHARACTER_CARDS}}|{{STYLE_GUIDE}}|{{COMPRESSION_OUTLINE}}|{{EVIDENCE_PACK}}';
    const result = injectPrompt(template, {
      compressedContext: 'CTX',
      characterCards: 'CARDS',
      styleGuide: 'STYLE',
      compressionOutline: 'OUTLINE',
      evidencePack: 'EVIDENCE',
    });
    expect(result).toBe('CTX|CARDS|STYLE|OUTLINE|EVIDENCE');
  });
});
