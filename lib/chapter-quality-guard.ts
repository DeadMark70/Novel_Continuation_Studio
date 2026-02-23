import type { ChapterQualityBreakdown } from '@/lib/consistency-types';

export interface ChapterQualityInput {
  chapterText: string;
  targetStoryWordCount?: number;
  targetChapterCount?: number;
}

export interface ChapterQualityResult {
  score: number;
  breakdown: ChapterQualityBreakdown;
  warnings: string[];
}

const AI_PHRASE_PATTERNS = ['彷彿', '如同', '那種感覺就像'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function countOccurrences(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function countKeyword(text: string, keyword: string): number {
  if (!keyword) {
    return 0;
  }
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return countOccurrences(text, new RegExp(escaped, 'g'));
}

function splitSentences(text: string): string[] {
  return text
    .split(/[\n。！？!?]+/g)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/g)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function estimateExpectedChapterLength(input: ChapterQualityInput): number {
  const targetStoryWordCount = input.targetStoryWordCount;
  const targetChapterCount = input.targetChapterCount;
  if (
    Number.isFinite(targetStoryWordCount) &&
    Number.isFinite(targetChapterCount) &&
    targetStoryWordCount &&
    targetChapterCount &&
    targetStoryWordCount > 0 &&
    targetChapterCount > 0
  ) {
    return Math.max(1200, Math.round(targetStoryWordCount / targetChapterCount));
  }
  return 4200;
}

export function evaluateChapterQuality(input: ChapterQualityInput): ChapterQualityResult {
  const trimmed = input.chapterText.trim();
  const normalized = trimmed.replace(/\s+/g, '');
  const length = normalized.length;
  const penalties: string[] = [];
  const warnings: string[] = [];

  const expectedLength = estimateExpectedChapterLength(input);
  const minLength = Math.floor(expectedLength * 0.75);
  const maxLength = Math.ceil(expectedLength * 1.25);

  let wordScore = 100;
  if (length < minLength) {
    const ratio = (minLength - length) / Math.max(1, minLength);
    wordScore = clamp(100 - (ratio * 130), 25, 100);
    penalties.push(`章節字數低於建議區間（${length} < ${minLength}）。`);
    warnings.push('章節偏短，可能導致 Phase 3 規劃情節覆蓋不足。');
  } else if (length > maxLength) {
    const ratio = (length - maxLength) / Math.max(1, maxLength);
    wordScore = clamp(100 - (ratio * 100), 35, 100);
    penalties.push(`章節字數高於建議區間（${length} > ${maxLength}）。`);
    warnings.push('章節偏長，可能增加截斷風險。');
  }

  const sceneBreaks = countOccurrences(trimmed, /\n\s*\n/g)
    + countOccurrences(trimmed, /^\s*(\*{3,}|-{3,}|—{2,})\s*$/gm);
  const sceneScore = sceneBreaks >= 2 ? 100 : sceneBreaks === 1 ? 78 : 55;
  if (sceneBreaks === 0) {
    penalties.push('章節缺少明顯場景切換痕跡。');
  }

  const endingComplete = /[。！？!?」』"）)]$/.test(trimmed);
  const endingScore = endingComplete ? 100 : 45;
  if (!endingComplete) {
    penalties.push('章節結尾缺少完整收束標點，疑似截斷或句尾未完成。');
    warnings.push('章節結尾可能不完整。');
  }

  const structure = Math.round((wordScore * 0.55) + (sceneScore * 0.25) + (endingScore * 0.2));

  const sentences = splitSentences(trimmed);
  const sentenceLengths = sentences.map((sentence) => sentence.replace(/\s+/g, '').length);
  const over65Count = sentenceLengths.filter((value) => value > 65).length;
  const over65Ratio = sentenceLengths.length > 0 ? over65Count / sentenceLengths.length : 0;
  const longSentenceScore = clamp(100 - (over65Ratio * 140), 20, 100);
  if (over65Ratio > 0.2) {
    penalties.push(`長句比例過高（>${Math.round(over65Ratio * 100)}% 句子超過 65 字）。`);
    warnings.push('句長過長，文體控制偏離。');
  }

  const dashCount = countOccurrences(trimmed, /—/g) + countOccurrences(trimmed, /--/g);
  const dashDensity = length > 0 ? (dashCount / length) * 1000 : 0;
  const dashScore = dashDensity <= 8 ? 100 : clamp(100 - ((dashDensity - 8) * 12), 10, 100);
  if (dashDensity > 8) {
    penalties.push(`破折號密度過高（${dashDensity.toFixed(1)}/1000 字）。`);
  }

  const aiPhraseCount = AI_PHRASE_PATTERNS.reduce(
    (sum, pattern) => sum + countKeyword(trimmed, pattern),
    0
  );
  const phraseScore = aiPhraseCount === 0 ? 100 : clamp(100 - (aiPhraseCount * 8), 35, 100);
  if (aiPhraseCount > 0) {
    penalties.push(`偵測到 ${aiPhraseCount} 次模板化比喻句式。`);
  }

  const style = Math.round((longSentenceScore * 0.45) + (dashScore * 0.35) + (phraseScore * 0.2));

  const latinCount = countOccurrences(trimmed, /[A-Za-z]/g);
  const latinRatio = length > 0 ? latinCount / length : 0;
  const latinScore = latinRatio <= 0.01 ? 100 : clamp(100 - ((latinRatio - 0.01) * 3500), 0, 100);
  if (latinRatio > 0.01) {
    penalties.push(`中英混雜比例偏高（${(latinRatio * 100).toFixed(2)}% Latin 字元）。`);
    warnings.push('語言純度下降，請檢查英文片段或外語殘留。');
  }

  const garbledCount = countOccurrences(trimmed, /�/g)
    + countOccurrences(trimmed, /[%]{2,}|[@]{2,}|[#]{2,}/g);
  const garbledScore = garbledCount === 0 ? 100 : clamp(100 - (garbledCount * 18), 0, 100);
  if (garbledCount > 0) {
    penalties.push(`疑似亂碼/異常符號片段 ${garbledCount} 處。`);
    warnings.push('偵測到疑似亂碼或異常符號。');
  }

  const language = Math.round((latinScore * 0.6) + (garbledScore * 0.4));

  const paragraphs = splitParagraphs(trimmed);
  const longParagraphCount = paragraphs.filter((paragraph) => paragraph.replace(/\s+/g, '').length > 260).length;
  const longParagraphRatio = paragraphs.length > 0 ? longParagraphCount / paragraphs.length : 0;
  const paragraphScore = clamp(100 - (longParagraphRatio * 90), 35, 100);
  if (longParagraphRatio > 0.55) {
    penalties.push('長段比例偏高，節奏可能過於黏滯。');
  }

  const shortSentenceCount = sentenceLengths.filter((value) => value <= 20).length;
  const shortSentenceRatio = sentenceLengths.length > 0 ? shortSentenceCount / sentenceLengths.length : 0;
  const shortSentenceScore = shortSentenceRatio >= 0.08
    ? 100
    : clamp(100 - ((0.08 - shortSentenceRatio) * 500), 45, 100);
  if (shortSentenceRatio < 0.08) {
    penalties.push('短句節奏信號不足，高潮段落可能欠缺切分。');
  }

  const pacing = Math.round((paragraphScore * 0.6) + (shortSentenceScore * 0.4));

  const score = Math.round(
    (structure * 0.25) +
    (style * 0.35) +
    (language * 0.25) +
    (pacing * 0.15)
  );

  return {
    score: clamp(score, 0, 100),
    breakdown: {
      structure,
      style,
      language,
      pacing,
      penalties,
    },
    warnings,
  };
}

