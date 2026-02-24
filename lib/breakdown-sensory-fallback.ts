import type { SensoryAnchorTemplate } from '@/lib/llm-types';
import {
  extractChapterField,
  getBreakdownChapterBlocks,
} from '@/lib/breakdown-normalizer';
import type { RankedSensoryTag } from '@/lib/sensory-tag-ranking';
import { sanitizeSensoryTagsStrict } from '@/lib/sensory-tags';

export interface BreakdownFallbackReport {
  repaired: boolean;
  injectedTagCount: number;
  injectedPovCount: number;
  repairedChapters: number[];
  injectedTagsByChapter: Record<number, string[]>;
}

interface ApplyBreakdownSensoryFallbackInput {
  content: string;
  rankedTags: RankedSensoryTag[];
  templates: SensoryAnchorTemplate[];
  chapterRangeStart: number;
  chapterRangeEnd: number;
}

interface WeightedTag {
  tag: string;
  weight: number;
}

const DEFAULT_POV = '通用';

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
}

function createSeededRandom(seed: number): () => number {
  let state = seed || 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function splitTags(raw: string): string[] {
  if (!raw) {
    return [];
  }
  return sanitizeSensoryTagsStrict(
    raw
      .split(/[、,，/／|]/u)
      .map((entry) => entry.trim())
      .filter(Boolean),
    3
  );
}

function inferChapterPov(
  chapterContent: string,
  templates: SensoryAnchorTemplate[]
): string {
  const candidates = templates
    .map((entry) => entry.povCharacter?.trim())
    .filter((entry): entry is string => Boolean(entry && entry.length > 0 && entry !== DEFAULT_POV));

  const matched = candidates
    .filter((entry) => chapterContent.includes(entry))
    .sort((a, b) => b.length - a.length);

  return matched[0] ?? DEFAULT_POV;
}

function buildWeightedPool(
  rankedTags: RankedSensoryTag[],
  chapterPov: string,
  templates: SensoryAnchorTemplate[],
  recentTags: Set<string>
): WeightedTag[] {
  const byTagPovBoost = new Map<string, number>();

  for (const template of templates) {
    const templatePov = template.povCharacter?.trim() || DEFAULT_POV;
    if (templatePov !== chapterPov && templatePov !== DEFAULT_POV) {
      continue;
    }
    const templateTags = sanitizeSensoryTagsStrict(template.tags ?? [], 8);
    for (const tag of templateTags) {
      const current = byTagPovBoost.get(tag) ?? 0;
      byTagPovBoost.set(tag, current + (templatePov === chapterPov ? 1.2 : 0.5));
    }
  }

  return rankedTags
    .map((entry) => {
      const povBoost = byTagPovBoost.get(entry.tag) ?? 0;
      const recentPenalty = recentTags.has(entry.tag) ? 0.45 : 1;
      return {
        tag: entry.tag,
        weight: Math.max(0.05, (entry.score + povBoost) * recentPenalty),
      };
    })
    .sort((a, b) => b.weight - a.weight);
}

function pickWeightedTags(
  pool: WeightedTag[],
  chapterNumber: number,
  chapterContent: string
): string[] {
  if (pool.length === 0) {
    return [];
  }
  const rng = createSeededRandom(hashString(`${chapterNumber}:${chapterContent.length}`));
  const count = 1 + Math.floor(rng() * 3);
  const working = [...pool];
  const selected: string[] = [];

  while (selected.length < count && working.length > 0) {
    const total = working.reduce((sum, entry) => sum + entry.weight, 0);
    let threshold = rng() * total;
    let pickedIndex = 0;
    for (let index = 0; index < working.length; index += 1) {
      threshold -= working[index].weight;
      if (threshold <= 0) {
        pickedIndex = index;
        break;
      }
    }
    selected.push(working[pickedIndex].tag);
    working.splice(pickedIndex, 1);
  }

  return selected;
}

function upsertChapterField(
  chapterText: string,
  label: string,
  value: string
): string {
  const heading = `【${label}】`;
  const inlinePattern = new RegExp(`${heading}[^\\n]*`, 'u');
  if (inlinePattern.test(chapterText)) {
    return chapterText.replace(inlinePattern, `${heading}${value}`);
  }
  const trimmed = chapterText.trimEnd();
  return `${trimmed}\n${heading}${value}`;
}

export function applyBreakdownSensoryFallback({
  content,
  rankedTags,
  templates,
  chapterRangeStart,
  chapterRangeEnd,
}: ApplyBreakdownSensoryFallbackInput): { content: string; report: BreakdownFallbackReport } {
  const blocks = getBreakdownChapterBlocks(content);
  if (blocks.length === 0) {
    return {
      content,
      report: {
        repaired: false,
        injectedTagCount: 0,
        injectedPovCount: 0,
        repairedChapters: [],
        injectedTagsByChapter: {},
      },
    };
  }

  const safeStart = Math.max(1, Math.floor(chapterRangeStart));
  const safeEnd = Math.max(safeStart, Math.floor(chapterRangeEnd));
  const recentTags = new Set<string>();
  const repairedChapters: number[] = [];
  const injectedTagsByChapter: Record<number, string[]> = {};
  let injectedTagCount = 0;
  let injectedPovCount = 0;
  let cursor = 0;
  let nextContent = '';

  for (const block of blocks) {
    nextContent += content.slice(cursor, block.start);
    const inRange = block.chapterNumber >= safeStart && block.chapterNumber <= safeEnd;
    let chapterText = content.slice(block.start, block.end);

    if (inRange) {
      let chapterRepaired = false;
      const rawTagValue = extractChapterField(chapterText, '推薦感官標籤');
      const rawPovValue = extractChapterField(chapterText, '感官視角重心');
      const existingTags = splitTags(rawTagValue);
      let chapterPov = rawPovValue?.trim();

      if (!chapterPov || chapterPov === '無') {
        chapterPov = inferChapterPov(chapterText, templates);
        chapterText = upsertChapterField(chapterText, '感官視角重心', chapterPov);
        injectedPovCount += 1;
        chapterRepaired = true;
      }

      if (existingTags.length === 0) {
        const pool = buildWeightedPool(
          rankedTags,
          chapterPov || DEFAULT_POV,
          templates,
          recentTags
        );
        const selectedTags = pickWeightedTags(pool, block.chapterNumber, chapterText);
        if (selectedTags.length > 0) {
          chapterText = upsertChapterField(
            chapterText,
            '推薦感官標籤',
            selectedTags.join('、')
          );
          injectedTagsByChapter[block.chapterNumber] = selectedTags;
          injectedTagCount += selectedTags.length;
          selectedTags.forEach((tag) => recentTags.add(tag));
          chapterRepaired = true;
        }
      }

      if (chapterRepaired) {
        repairedChapters.push(block.chapterNumber);
      }
    }

    nextContent += chapterText;
    cursor = block.end;
  }
  nextContent += content.slice(cursor);

  return {
    content: nextContent,
    report: {
      repaired: repairedChapters.length > 0,
      injectedTagCount,
      injectedPovCount,
      repairedChapters,
      injectedTagsByChapter,
    },
  };
}
