export interface PromptContext {
  originalNovel?: string;
  analysis?: string;
  outline?: string;
  breakdown?: string;
  previousChapters?: string[];
  userNotes?: string;
  nextChapterNumber?: number;
}

/**
 * Replaces placeholders in the format {{VARIABLE}} or [Legacy Placeholder] with actual content.
 */
export function injectPrompt(template: string, context: PromptContext): string {
  let result = template;

  // Modern {{Placeholders}}
  if (context.originalNovel) {
    result = result.replace(/{{NOVEL_TEXT}}/g, context.originalNovel);
    // Legacy support
    result = result.replace(/\x5B插入小說全文\x5D|\x5B插入原始小說全文\x5D/g, context.originalNovel);
  }

  if (context.analysis) {
    result = result.replace(/{{ANALYSIS_RESULT}}/g, context.analysis);
    // Legacy support
    result = result.replace(/\x5B插入提示詞1的輸出\x5D/g, context.analysis);
  }

  if (context.outline) {
    result = result.replace(/{{OUTLINE_RESULT}}/g, context.outline);
    // Legacy support
    result = result.replace(/\x5B插入提示詞2的輸出\x5D/g, context.outline);
  }

  if (context.breakdown) {
    result = result.replace(/{{CHAPTER_BREAKDOWN}}/g, context.breakdown);
    // Legacy support
    result = result.replace(/\x5B插入提示詞3的輸出\x5D|\x5B插入章節框架\x5D/g, context.breakdown);
  }

  if (context.previousChapters && context.previousChapters.length > 0) {
    const chaptersText = context.previousChapters.join('\n\n---\n\n');
    result = result.replace(/{{GENERATED_CHAPTERS}}/g, chaptersText);
    // Legacy support
    result = result.replace(/\x5B插入前面所有已生成的章節\x5D|\x5B已生成的前面章節\x5D/g, chaptersText);
  } else {
    result = result.replace(/{{GENERATED_CHAPTERS}}/g, '尚未生成任何章節。');
  }

  if (context.nextChapterNumber !== undefined) {
    result = result.replace(/{{NEXT_CHAPTER_NUMBER}}/g, context.nextChapterNumber.toString());
  }

  // Handle User Notes / Direction
  if (context.userNotes) {
    // New automation-friendly conditional blocks
    result = result.replace(/{{USER_DIRECTION_SECTION}}/g, `**用戶的故事方向偏好：**\n${context.userNotes}`);
    result = result.replace(/{{USER_DIRECTION_REQUIREMENT}}/g, `- 特別注意用戶提出的方向偏好，將其自然融入劇情`);
    
    // Legacy support: Try to inject before "---" if no placeholder found
    if (!template.includes('{{USER_DIRECTION_SECTION}}') && !template.includes('{{USER_DIRECTION_REQUIREMENT}}')) {
      const splitIndex = result.lastIndexOf('---');
      if (splitIndex !== -1) {
        const injection = `\n\n【用戶額外指示/劇情走向】\n${context.userNotes}\n\n`;
        result = result.slice(0, splitIndex) + injection + result.slice(splitIndex);
      } else {
        result += `\n\n【用戶額外指示/劇情走向】\n${context.userNotes}`;
      }
    }
  } else {
    // Clear the placeholders if no notes
    result = result.replace(/{{USER_DIRECTION_SECTION}}/g, '');
    result = result.replace(/{{USER_DIRECTION_REQUIREMENT}}/g, '');
  }

  return result;
}
