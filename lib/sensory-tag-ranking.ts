import type { SensoryAnchorTemplate } from '@/lib/llm-types';
import { CANONICAL_SENSORY_TAGS, sanitizeSensoryTagsStrict } from '@/lib/sensory-tags';

export interface SensoryTagUsageEntry {
  count: number;
  lastUsedAt: number;
  byPov?: Record<string, number>;
}

export type SensoryTagUsageMap = Record<string, SensoryTagUsageEntry>;

export interface RankedSensoryTag {
  tag: string;
  score: number;
}

interface RankInjectableSensoryTagsInput {
  templates: SensoryAnchorTemplate[];
  usageMap?: SensoryTagUsageMap;
  povHints?: string[];
  recentTemplateIds?: string[];
  limit?: number;
}

const DEFAULT_LIMIT = 30;
const RECENT_USAGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function normalizePov(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : '通用';
}

function addScore(map: Map<string, number>, tag: string, delta: number): void {
  if (!tag) {
    return;
  }
  map.set(tag, (map.get(tag) ?? 0) + delta);
}

export function sanitizeSensoryTagUsageMap(value: unknown): SensoryTagUsageMap {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const raw = value as Record<string, unknown>;
  const next: SensoryTagUsageMap = {};
  for (const [key, entry] of Object.entries(raw)) {
    const normalizedTags = sanitizeSensoryTagsStrict([key], 1);
    if (normalizedTags.length === 0) {
      continue;
    }
    const tag = normalizedTags[0];
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const rawEntry = entry as Record<string, unknown>;
    const count = Number(rawEntry.count);
    const lastUsedAt = Number(rawEntry.lastUsedAt);
    if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(lastUsedAt)) {
      continue;
    }
    const byPovRaw = rawEntry.byPov;
    const byPov: Record<string, number> = {};
    if (byPovRaw && typeof byPovRaw === 'object') {
      for (const [povKey, povCountRaw] of Object.entries(byPovRaw as Record<string, unknown>)) {
        const povCount = Number(povCountRaw);
        if (Number.isFinite(povCount) && povCount > 0) {
          byPov[povKey] = Math.floor(povCount);
        }
      }
    }
    next[tag] = {
      count: Math.floor(count),
      lastUsedAt: Math.floor(lastUsedAt),
      byPov: Object.keys(byPov).length > 0 ? byPov : undefined,
    };
  }
  return next;
}

export function rankInjectableSensoryTags({
  templates,
  usageMap = {},
  povHints = [],
  recentTemplateIds = [],
  limit = DEFAULT_LIMIT,
}: RankInjectableSensoryTagsInput): RankedSensoryTag[] {
  const safeLimit = Math.max(1, Math.min(60, Math.floor(limit)));
  const scoreMap = new Map<string, number>();
  const now = Date.now();
  const povHintSet = new Set(povHints.map((entry) => entry.trim()).filter(Boolean));
  const recentTemplateSet = new Set(recentTemplateIds.map((entry) => entry.trim()).filter(Boolean));

  for (const template of templates) {
    const templateTags = sanitizeSensoryTagsStrict(template.tags ?? [], 8);
    if (templateTags.length === 0) {
      continue;
    }
    const templatePov = normalizePov(template.povCharacter);
    const hasPovHint = povHintSet.has(templatePov);
    const povBonus = hasPovHint ? 3.2 : templatePov === '通用' ? 0.9 : 0.5;
    const recencyBonus = recentTemplateSet.has(template.id) ? 1.2 : 0;

    for (const tag of templateTags) {
      addScore(scoreMap, tag, 1 + povBonus + recencyBonus);
    }
  }

  for (const tag of CANONICAL_SENSORY_TAGS) {
    addScore(scoreMap, tag, 0.2);
  }

  for (const [tag, usage] of Object.entries(usageMap)) {
    addScore(scoreMap, tag, Math.log1p(Math.max(0, usage.count)) * 1.8);
    if (now - usage.lastUsedAt <= RECENT_USAGE_WINDOW_MS) {
      addScore(scoreMap, tag, 0.6);
    }
    if (usage.byPov && povHintSet.size > 0) {
      for (const povHint of povHintSet) {
        const povCount = usage.byPov[povHint];
        if (Number.isFinite(povCount) && (povCount as number) > 0) {
          addScore(scoreMap, tag, Math.log1p(povCount as number) * 1.2);
        }
      }
    }
  }

  return [...scoreMap.entries()]
    .map(([tag, score]) => ({ tag, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, safeLimit);
}

export function rankedTagsToString(rankedTags: RankedSensoryTag[]): string {
  if (rankedTags.length === 0) {
    return '';
  }
  return rankedTags.map((entry) => entry.tag).join('、');
}
