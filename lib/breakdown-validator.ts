import {
  extractChapterField,
  getBreakdownChapterBlocks,
} from '@/lib/breakdown-normalizer';

const INCOMPLETE_MARKERS = [
  '以下省略',
  '略同',
  '完整版請補全',
  '其餘省略',
  '後略',
  '省略',
];

const TRUNCATED_END_RE = /[（(【\[:：,\-—…]$/u;

export interface ValidateBreakdownInput {
  content: string;
  chapterRangeStart: number;
  chapterRangeEnd: number;
  requireSensoryFields?: boolean;
}

export interface BreakdownValidationResult {
  ok: boolean;
  errors: string[];
  missingChapterNumbers: number[];
  extraChapterNumbers: number[];
  missingSensoryTagChapters: number[];
  missingSensoryPovChapters: number[];
  likelyTruncated: boolean;
}

function hasAnyIncompleteMarker(content: string): boolean {
  return INCOMPLETE_MARKERS.some((marker) => content.includes(marker));
}

function normalizeRangeValue(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

function isLikelyTruncatedTail(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) {
    return true;
  }
  const tail = trimmed.slice(-80);
  return TRUNCATED_END_RE.test(tail);
}

export function validateBreakdownForSensoryMapping({
  content,
  chapterRangeStart,
  chapterRangeEnd,
  requireSensoryFields = true,
}: ValidateBreakdownInput): BreakdownValidationResult {
  const start = Math.max(1, normalizeRangeValue(chapterRangeStart, 1));
  const end = Math.max(start, normalizeRangeValue(chapterRangeEnd, start));
  const expectedCount = end - start + 1;

  const blocks = getBreakdownChapterBlocks(content);
  const chapterNumbers = blocks.map((entry) => entry.chapterNumber);
  const chapterSet = new Set(chapterNumbers);

  const missingChapterNumbers: number[] = [];
  for (let number = start; number <= end; number += 1) {
    if (!chapterSet.has(number)) {
      missingChapterNumbers.push(number);
    }
  }

  const extraChapterNumbers = [...chapterSet].filter(
    (number) => number < start || number > end
  ).sort((a, b) => a - b);

  const missingSensoryTagChapters: number[] = [];
  const missingSensoryPovChapters: number[] = [];

  if (requireSensoryFields) {
    for (const block of blocks) {
      if (block.chapterNumber < start || block.chapterNumber > end) {
        continue;
      }
      const tags = extractChapterField(block.content, '推薦感官標籤');
      const pov = extractChapterField(block.content, '感官視角重心');
      if (!tags || tags === '無') {
        missingSensoryTagChapters.push(block.chapterNumber);
      }
      if (!pov || pov === '無') {
        missingSensoryPovChapters.push(block.chapterNumber);
      }
    }
  }

  const errors: string[] = [];
  if (hasAnyIncompleteMarker(content)) {
    errors.push('Breakdown contains incomplete markers (e.g. "以下省略").');
  }
  if (blocks.length !== expectedCount) {
    errors.push(`Expected ${expectedCount} chapters in range ${start}-${end}, got ${blocks.length}.`);
  }
  if (missingChapterNumbers.length > 0) {
    errors.push(`Missing chapter numbers: ${missingChapterNumbers.join(', ')}.`);
  }
  if (extraChapterNumbers.length > 0) {
    errors.push(`Unexpected chapter numbers: ${extraChapterNumbers.join(', ')}.`);
  }
  if (requireSensoryFields && missingSensoryTagChapters.length > 0) {
    errors.push(`Missing sensory tags in chapters: ${missingSensoryTagChapters.join(', ')}.`);
  }
  if (requireSensoryFields && missingSensoryPovChapters.length > 0) {
    errors.push(`Missing sensory POV in chapters: ${missingSensoryPovChapters.join(', ')}.`);
  }

  const likelyTruncated = isLikelyTruncatedTail(content)
    || (requireSensoryFields && blocks.length > 0 && (
      !extractChapterField(blocks[blocks.length - 1].content, '推薦感官標籤')
      || !extractChapterField(blocks[blocks.length - 1].content, '感官視角重心')
    ));

  if (likelyTruncated) {
    errors.push('Breakdown tail looks truncated or last chapter is structurally incomplete.');
  }

  return {
    ok: errors.length === 0,
    errors,
    missingChapterNumbers,
    extraChapterNumbers,
    missingSensoryTagChapters,
    missingSensoryPovChapters,
    likelyTruncated,
  };
}
