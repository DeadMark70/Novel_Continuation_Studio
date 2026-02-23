export const RESUME_LAST_OUTPUT_DIRECTIVE = '[[RESUME_LAST_OUTPUT]]';

const RESUME_LAST_OUTPUT_PATTERN = /\[\[RESUME_LAST_OUTPUT\]\]/i;
const RESUME_LAST_OUTPUT_REPLACE_PATTERN = /\[\[RESUME_LAST_OUTPUT\]\]/gi;
const DEFAULT_RESUME_PREFIX_CHARS = 180;
const DEFAULT_MAX_OVERLAP = 220;

function normalizeSnippet(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function trimToTail(text: string, maxChars: number): string {
  if (maxChars <= 0 || text.length <= maxChars) {
    return text;
  }
  return text.slice(-maxChars);
}

function detectRepeatedPrefix(base: string, append: string, maxOverlap: number): number {
  const safeMax = Math.min(maxOverlap, base.length, append.length);
  for (let size = safeMax; size > 0; size -= 1) {
    const baseTail = base.slice(-size);
    const appendHead = append.slice(0, size);
    if (baseTail === appendHead) {
      return size;
    }
  }
  return 0;
}

function hasUnclosedSymmetricQuote(text: string, quote: string): boolean {
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char !== quote) {
      continue;
    }
    const prev = i > 0 ? text[i - 1] : '';
    if (prev === '\\') {
      continue;
    }
    count += 1;
  }
  return count % 2 === 1;
}

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

export function buildResumePrefix(existingOutput: string, maxChars = DEFAULT_RESUME_PREFIX_CHARS): string {
  const trimmed = existingOutput.trimEnd();
  if (!trimmed) {
    return '';
  }
  return trimToTail(trimmed, maxChars);
}

export function hasUnclosedQuotePairs(text: string): boolean {
  const openCorner = (text.match(/「/g) || []).length;
  const closeCorner = (text.match(/」/g) || []).length;
  if (openCorner !== closeCorner) {
    return true;
  }
  const openDoubleCorner = (text.match(/『/g) || []).length;
  const closeDoubleCorner = (text.match(/』/g) || []).length;
  if (openDoubleCorner !== closeDoubleCorner) {
    return true;
  }
  return hasUnclosedSymmetricQuote(text, '"');
}

export function mergeResumedContent(existingOutput: string, appendedChunk: string): {
  merged: string;
  trimmedOverlapChars: number;
  hasUnclosedQuotes: boolean;
} {
  const overlap = detectRepeatedPrefix(existingOutput, appendedChunk, DEFAULT_MAX_OVERLAP);
  const normalizedAppend = overlap > 0 ? appendedChunk.slice(overlap) : appendedChunk;
  const merged = `${existingOutput}${normalizedAppend}`;
  return {
    merged,
    trimmedOverlapChars: overlap,
    hasUnclosedQuotes: hasUnclosedQuotePairs(merged),
  };
}

export function buildResumePrompt(originalPrompt: string, existingOutput: string): string {
  const resumePrefix = buildResumePrefix(existingOutput);
  return [
    '你上一輪回覆因輸出長度或流程中斷而未完整。',
    '請嚴格遵守以下規則：',
    '1. 只輸出「尚未輸出的新內容」。',
    '2. 不得重複、改寫、摘要、重排既有內容。',
    '3. 從目前結尾自然接續，保持相同格式與段落結構。',
    '4. 不要加前言、說明、結語。',
    '5. 必須直接延續「銜接前綴」之後的內容，不要重複前綴本身。',
    '',
    '【銜接前綴（僅供接續，不得重複輸出）】',
    normalizeSnippet(resumePrefix),
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
