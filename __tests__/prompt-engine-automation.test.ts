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
    expect(result).toBe('Chapters: C1\n\n---\n\nC2');
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
});
