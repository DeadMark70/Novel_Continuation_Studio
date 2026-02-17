export const RESUME_LAST_OUTPUT_DIRECTIVE = '[[RESUME_LAST_OUTPUT]]';

const RESUME_LAST_OUTPUT_PATTERN = /\[\[RESUME_LAST_OUTPUT\]\]/i;
const RESUME_LAST_OUTPUT_REPLACE_PATTERN = /\[\[RESUME_LAST_OUTPUT\]\]/gi;

export function hasResumeLastOutputDirective(value?: string): boolean {
  if (!value) {
    return false;
  }
  return RESUME_LAST_OUTPUT_PATTERN.test(value);
}

export function stripResumeLastOutputDirective(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const stripped = value.replace(RESUME_LAST_OUTPUT_REPLACE_PATTERN, '').trim();
  return stripped || undefined;
}

export function appendResumeLastOutputDirective(value?: string): string {
  const normalized = stripResumeLastOutputDirective(value);
  return normalized
    ? `${normalized}\n${RESUME_LAST_OUTPUT_DIRECTIVE}`
    : RESUME_LAST_OUTPUT_DIRECTIVE;
}

export function buildResumePrompt(originalPrompt: string, existingOutput: string): string {
  return [
    '你上一輪回覆因輸出長度或流程中斷而未完整。',
    '請嚴格遵守以下規則：',
    '1. 只輸出「尚未輸出的新內容」。',
    '2. 不得重複、改寫、摘要、重排既有內容。',
    '3. 從目前結尾自然接續，保持相同格式與段落結構。',
    '4. 不要加前言、說明、結語。',
    '',
    '【原始任務】',
    originalPrompt,
    '',
    '【已輸出內容（禁止重複）】',
    existingOutput,
    '',
    '請直接輸出續寫內容。',
  ].join('\n');
}
