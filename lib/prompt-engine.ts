export interface PromptContext {
  originalNovel?: string;
  analysis?: string;
  outline?: string;
  breakdown?: string;
  previousChapters?: string[];
  userNotes?: string; // For Step 2 guided injection
}

/**
 * Replaces placeholders in the format [Placeholder Name] with actual content.
 */
export function injectPrompt(template: string, context: PromptContext): string {
  let result = template;

  if (context.originalNovel) {
    result = result.replace(/\x5B插入小說全文\x5D|\x5B插入原始小說全文\x5D/g, context.originalNovel);
  }

  if (context.analysis) {
    result = result.replace(/\x5B插入提示詞1的輸出\x5D/g, context.analysis);
  }

  if (context.outline) {
    result = result.replace(/\x5B插入提示詞2的輸出\x5D/g, context.outline);
  }

  if (context.breakdown) {
    result = result.replace(/\x5B插入提示詞3的輸出\x5D|\x5B插入章節框架\x5D/g, context.breakdown);
  }

  if (context.previousChapters && context.previousChapters.length > 0) {
    const chaptersText = context.previousChapters.join('\n\n---\n\n');
    result = result.replace(/\x5B插入前面所有已生成的章節\x5D|\x5B已生成的前面章節\x5D/g, chaptersText);
  }

  // Handle User Notes injection for Step 2
  // We'll append it if the placeholder isn't explicitly there, or replace a specific token if we define one.
  // For now, let's append it to the "Analysis" section if it exists, or at the end of the input block.
  if (context.userNotes) {
    // If there's a specific placeholder for notes, use it. Otherwise, append to context.
    // The current default prompts don't have a specific [User Notes] slot, so we'll inject it intelligently.
    // Strategy: Look for "---" which usually separates input from instruction. Inject before that.
    const splitIndex = result.lastIndexOf('---');
    if (splitIndex !== -1) {
      const injection = `\n\n【用戶額外指示/劇情走向】\n${context.userNotes}\n\n`;
      result = result.slice(0, splitIndex) + injection + result.slice(splitIndex);
    } else {
      result += `\n\n【用戶額外指示/劇情走向】\n${context.userNotes}`;
    }
  }

  return result;
}
