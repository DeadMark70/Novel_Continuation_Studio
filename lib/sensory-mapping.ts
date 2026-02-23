import type { AutoSensoryMappingResult, SensoryAnchorTemplate } from '@/lib/llm-types';
import {
  normalizePovCharacter,
  sanitizeSensoryTagsStrict,
} from '@/lib/sensory-tags';

interface AutoSensoryMappingInput {
  templates: SensoryAnchorTemplate[];
  breakdown: string;
  chapterNumber: number;
  recentlyUsedIds?: string[];
  maxAnchors?: number;
}

interface NormalizedTemplate {
  id: string;
  content: string;
  tags: string[];
  povCharacter: string;
}

const DEFAULT_MAX_ANCHORS = 2;
const FALLBACK_POV = '通用';
const BREAKDOWN_RULES_HEADING = '【張力升級與去重守則】';

function normalizeBlockKey(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function toNormalizedTemplates(templates: SensoryAnchorTemplate[]): NormalizedTemplate[] {
  return templates
    .map((template) => ({
      id: template.id?.trim() || '',
      content: template.content?.trim() || '',
      tags: sanitizeSensoryTagsStrict(template.tags, 8),
      povCharacter: normalizePovCharacter(template.povCharacter),
    }))
    .filter((template) => template.id && template.content);
}

function findChapterBlock(breakdown: string, chapterNumber: number): string {
  const headingPattern = /【第\s*(\d+)\s*章[^】]*】/gu;
  let match = headingPattern.exec(breakdown);
  let targetStart = -1;
  let targetEnd = breakdown.length;

  while (match) {
    const currentChapter = Number.parseInt(match[1], 10);
    if (currentChapter === chapterNumber) {
      targetStart = match.index;
      const next = headingPattern.exec(breakdown);
      targetEnd = next ? next.index : breakdown.length;
      break;
    }
    match = headingPattern.exec(breakdown);
  }

  if (targetStart < 0) {
    return '';
  }

  const rulesIndex = breakdown.indexOf(BREAKDOWN_RULES_HEADING, targetStart);
  const boundedEnd = rulesIndex >= 0 ? Math.min(targetEnd, rulesIndex) : targetEnd;
  return breakdown.slice(targetStart, boundedEnd).trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractChapterField(chapterBlock: string, label: string): string {
  const inlinePattern = new RegExp(`【${escapeRegex(label)}】\\s*[:：]?\\s*([^\\n]+)`, 'u');
  const inlineMatch = chapterBlock.match(inlinePattern);
  if (inlineMatch && inlineMatch[1]) {
    return inlineMatch[1].trim();
  }

  const header = `【${label}】`;
  const headerIndex = chapterBlock.indexOf(header);
  if (headerIndex < 0) {
    return '';
  }
  const after = chapterBlock.slice(headerIndex + header.length);
  const lines = after
    .split('\n')
    .map((line) => line.replace(/^[\s:：\-*]+/u, '').trim())
    .filter(Boolean);
  return lines[0] ?? '';
}

function parseRecommendedTags(chapterBlock: string): string[] {
  const raw = extractChapterField(chapterBlock, '推薦感官標籤');
  if (!raw || raw === '無') {
    return [];
  }
  const chunks = raw
    .split(/[、,，/／|]/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return sanitizeSensoryTagsStrict(chunks, 3);
}

function parsePovCharacter(chapterBlock: string): string {
  const raw = extractChapterField(chapterBlock, '感官視角重心');
  if (!raw || raw === '無') {
    return FALLBACK_POV;
  }
  return normalizePovCharacter(raw, FALLBACK_POV);
}

function countTagHits(tags: string[], recommendedTags: string[]): number {
  if (recommendedTags.length === 0 || tags.length === 0) {
    return 0;
  }
  const recommended = new Set(recommendedTags);
  return tags.reduce((count, tag) => (recommended.has(tag) ? count + 1 : count), 0);
}

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function sortByPriority(
  templates: NormalizedTemplate[],
  chapterNumber: number,
  recommendedTags: string[],
  chapterPov: string
): NormalizedTemplate[] {
  return [...templates].sort((a, b) => {
    const aTagHits = countTagHits(a.tags, recommendedTags);
    const bTagHits = countTagHits(b.tags, recommendedTags);

    const aPovBonus = a.povCharacter === chapterPov ? 2 : a.povCharacter === FALLBACK_POV ? 1 : 0;
    const bPovBonus = b.povCharacter === chapterPov ? 2 : b.povCharacter === FALLBACK_POV ? 1 : 0;

    const scoreA = (aTagHits * 10) + (aPovBonus * 3);
    const scoreB = (bTagHits * 10) + (bPovBonus * 3);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    const hashA = stableHash(`${a.id}:${chapterNumber}`) % 1000;
    const hashB = stableHash(`${b.id}:${chapterNumber}`) % 1000;
    return hashB - hashA;
  });
}

function pickTemplates(
  pool: NormalizedTemplate[],
  fallbackPool: NormalizedTemplate[],
  maxAnchors: number,
  chapterNumber: number,
  recommendedTags: string[],
  chapterPov: string
): NormalizedTemplate[] {
  const selected: NormalizedTemplate[] = [];
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();

  const takeFrom = (source: NormalizedTemplate[]) => {
    const ordered = sortByPriority(source, chapterNumber, recommendedTags, chapterPov);
    for (const template of ordered) {
      if (selected.length >= maxAnchors) {
        break;
      }
      if (seenIds.has(template.id)) {
        continue;
      }
      const contentKey = normalizeBlockKey(template.content);
      if (!contentKey || seenContent.has(contentKey)) {
        continue;
      }
      seenIds.add(template.id);
      seenContent.add(contentKey);
      selected.push(template);
    }
  };

  takeFrom(pool);
  if (selected.length < maxAnchors) {
    takeFrom(fallbackPool);
  }
  return selected;
}

export function getAutoSensoryAnchors({
  templates,
  breakdown,
  chapterNumber,
  recentlyUsedIds = [],
  maxAnchors = DEFAULT_MAX_ANCHORS,
}: AutoSensoryMappingInput): AutoSensoryMappingResult {
  const normalizedTemplates = toNormalizedTemplates(templates);
  if (normalizedTemplates.length === 0) {
    return {
      anchorText: '',
      selectedTemplateIds: [],
      matchedTags: [],
      matchedPov: FALLBACK_POV,
    };
  }

  const chapterBlock = findChapterBlock(breakdown, chapterNumber);
  if (!chapterBlock) {
    return {
      anchorText: '',
      selectedTemplateIds: [],
      matchedTags: [],
      matchedPov: FALLBACK_POV,
    };
  }

  const recommendedTags = parseRecommendedTags(chapterBlock);
  const chapterPov = parsePovCharacter(chapterBlock);
  const hasSignal = recommendedTags.length > 0 || chapterPov !== FALLBACK_POV;
  if (!hasSignal) {
    return {
      anchorText: '',
      selectedTemplateIds: [],
      matchedTags: [],
      matchedPov: chapterPov,
    };
  }

  const byPov = chapterPov === FALLBACK_POV
    ? normalizedTemplates
    : (() => {
      const exact = normalizedTemplates.filter((entry) => entry.povCharacter === chapterPov);
      const shared = normalizedTemplates.filter((entry) => entry.povCharacter === FALLBACK_POV);
      if (exact.length > 0) {
        return [...exact, ...shared];
      }
      if (shared.length > 0) {
        return shared;
      }
      return normalizedTemplates;
    })();

  const byTag = recommendedTags.length === 0
    ? byPov
    : (() => {
      const matched = byPov.filter((entry) => countTagHits(entry.tags, recommendedTags) > 0);
      return matched.length > 0 ? matched : byPov;
    })();

  const recentlyUsedIdSet = new Set(recentlyUsedIds.map((entry) => entry.trim()).filter(Boolean));
  const freshPool = byTag.filter((entry) => !recentlyUsedIdSet.has(entry.id));
  const selected = pickTemplates(
    freshPool,
    byTag,
    Math.max(1, Math.min(4, Math.floor(maxAnchors))),
    chapterNumber,
    recommendedTags,
    chapterPov
  );

  return {
    anchorText: selected.map((entry) => entry.content).join('\n\n').trim(),
    selectedTemplateIds: selected.map((entry) => entry.id),
    matchedTags: recommendedTags,
    matchedPov: chapterPov,
  };
}

