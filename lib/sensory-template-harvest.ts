import type { HarvestedTemplateCandidate } from '@/lib/llm-types';
import { injectPrompt } from '@/lib/prompt-engine';
import { SENSORY_TEMPLATE_HARVEST_PROMPT } from '@/lib/prompts';
import { sanitizeSensoryTags } from '@/lib/sensory-tags';

const MAX_CANDIDATES = 5;
const MIN_CANDIDATES = 3;
const EROTIC_MARKERS = [
  '下身', '腿間', '乳', '胸', '臀', '陰', '蜜', '液', '濕', '黏', '抽搐', '痙攣', '失控', '喘',
  'thigh', 'breast', 'hip', 'groin', 'wet', 'slick', 'sticky', 'fluid', 'spasm', 'tremble', 'gasp',
];
const BODY_MARKERS = [
  '皮膚', '肌肉', '喉', '腰', '腿', '指', '唇', '呼吸', '身體', '腳', '掌',
  'skin', 'muscle', 'throat', 'waist', 'leg', 'finger', 'lip', 'breath', 'body', 'foot', 'palm',
];
const REACTION_MARKERS = [
  '發抖', '顫', '抽搐', '痙攣', '腿軟', '嗚咽', '喘', '失控', '滑', '咬',
  'tremble', 'shiver', 'spasm', 'gasp', 'choke', 'lose control', 'slip', 'clench', 'moan',
];
const ENVIRONMENT_MARKERS = [
  '海風', '雲', '落日', '天空', '地平線', '戰場', '屍體',
  'wind', 'cloud', 'sunset', 'sky', 'horizon', 'battlefield', 'corpse',
];

type RawHarvestCandidate = {
  text?: unknown;
  tags?: unknown;
  sensoryScore?: unknown;
  controlLossScore?: unknown;
};

function clampScore(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, numeric));
}

function sanitizeTags(value: unknown): string[] {
  return sanitizeSensoryTags(value, 8);
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }
  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/u, '')
    .replace(/```$/u, '')
    .trim();
}

function extractLikelyJsonArray(raw: string): string {
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    return raw;
  }
  return raw.slice(start, end + 1);
}

function repairJson(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1');
}

function parseJsonArrayBestEffort(raw: string): unknown[] {
  const attempts = [
    raw,
    stripCodeFence(raw),
    extractLikelyJsonArray(stripCodeFence(raw)),
    repairJson(extractLikelyJsonArray(stripCodeFence(raw))),
  ];

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Try next strategy.
    }
  }

  throw new Error('Failed to parse harvest JSON output.');
}

function normalizeCandidate(
  value: unknown,
  index: number,
  nowIso: string
): HarvestedTemplateCandidate | null {
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return null;
    }
    return {
      id: `harvest_${Date.now()}_${index}`,
      text,
      tags: [],
      sensoryScore: 0.8,
      controlLossScore: 0.8,
      source: 'uploaded_novel',
      createdAt: nowIso,
    };
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as RawHarvestCandidate;
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  if (!text) {
    return null;
  }

  return {
    id: `harvest_${Date.now()}_${index}`,
    text,
    tags: sanitizeTags(raw.tags),
    sensoryScore: clampScore(raw.sensoryScore, 0.8),
    controlLossScore: clampScore(raw.controlLossScore, 0.8),
    source: 'uploaded_novel',
    createdAt: nowIso,
  };
}

function countMarkers(text: string, markers: string[]): number {
  const lower = text.toLowerCase();
  return markers.reduce((count, marker) => (lower.includes(marker.toLowerCase()) ? count + 1 : count), 0);
}

function rankCandidate(candidate: HarvestedTemplateCandidate): number {
  const bodyHits = countMarkers(candidate.text, BODY_MARKERS);
  const eroticHits = countMarkers(candidate.text, EROTIC_MARKERS);
  const reactionHits = countMarkers(candidate.text, REACTION_MARKERS);
  const environmentHits = countMarkers(candidate.text, ENVIRONMENT_MARKERS);
  const markerScore = (eroticHits * 2.2) + (reactionHits * 1.8) + (bodyHits * 1.2) - (environmentHits * 0.8);
  return markerScore + (candidate.sensoryScore * 1.1) + (candidate.controlLossScore * 1.4);
}

export function buildSensoryTemplateHarvestPrompt(sourceText: string): string {
  return injectPrompt(SENSORY_TEMPLATE_HARVEST_PROMPT, {
    originalNovel: sourceText,
  });
}

export function parseHarvestCandidates(rawOutput: string): HarvestedTemplateCandidate[] {
  const parsedArray = parseJsonArrayBestEffort(rawOutput);
  const nowIso = new Date().toISOString();

  const normalized = parsedArray
    .map((entry, index) => normalizeCandidate(entry, index, nowIso))
    .filter((entry): entry is HarvestedTemplateCandidate => Boolean(entry));

  const deduped: HarvestedTemplateCandidate[] = [];
  const seen = new Set<string>();

  for (const item of normalized) {
    const key = item.text.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
    if (deduped.length >= MAX_CANDIDATES) {
      break;
    }
  }

  if (deduped.length === 0) {
    throw new Error('No valid sensory template candidates were extracted.');
  }

  const ranked = [...deduped].sort((a, b) => rankCandidate(b) - rankCandidate(a));
  const eroticPreferred = ranked.filter((candidate) => (
    countMarkers(candidate.text, EROTIC_MARKERS) > 0 ||
    countMarkers(candidate.text, REACTION_MARKERS) > 0
  ));

  const prioritized = eroticPreferred.length >= MIN_CANDIDATES ? eroticPreferred : ranked;

  if (deduped.length < MIN_CANDIDATES) {
    return prioritized.slice(0, MAX_CANDIDATES);
  }
  return prioritized.slice(0, MAX_CANDIDATES);
}
