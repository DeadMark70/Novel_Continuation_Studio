import type { HarvestedTemplateCandidate } from '@/lib/llm-types';
import { injectPrompt } from '@/lib/prompt-engine';
import { SENSORY_TEMPLATE_HARVEST_PROMPT } from '@/lib/prompts';
import { normalizePovCharacter, sanitizeSensoryTagsStrict } from '@/lib/sensory-tags';

const MAX_CANDIDATES = 4;
const MIN_CANDIDATES = 2;
const MIN_SENSORY_SCORE = 0.8;
const MIN_CONTROL_LOSS_SCORE = 0.75;
const MAX_TEMPLATE_TEXT_CHARS = 65;
const MIN_SHIFT_CHARS = 8;
const MAX_SHIFT_CHARS = 20;
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
const ABSTRACT_METAPHOR_MARKERS = [
  '靈魂', '命運', '永恆', '宇宙', '深淵', '救贖', '虛無', '神性',
  '自由的風', '命運的手', '星辰', '宿命', '哲學',
  'soul', 'destiny', 'eternity', 'cosmos', 'metaphor', 'philosophy',
];
const CONTEXT_DEPENDENCY_MARKERS = [
  '上一章', '前文', '先前', '當時', '那時', '如前', '前面提到',
  'as above', 'previous chapter', 'earlier',
];
const SIMPLIFIED_MARKERS = /[这来后发对说为与时会点吗么里们将于并让从吗]/u;
const MULTI_SENTENCE_SPLIT = /[。！？!?；;]/u;

type RawHarvestCandidate = {
  text?: unknown;
  psychologicalShift?: unknown;
  tags?: unknown;
  povCharacter?: unknown;
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
  return sanitizeSensoryTagsStrict(value, 8);
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

function stripInlineCodeFence(raw: string): string {
  return raw
    .replace(/```json/giu, '')
    .replace(/```/gu, '')
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

function extractLikelyJsonObject(raw: string): string {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
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
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}

function toHarvestArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value || typeof value !== 'object') {
    return null;
  }
  const asRecord = value as Record<string, unknown>;
  const candidateKeys = ['candidates', 'templates', 'items', 'results', 'data'];
  for (const key of candidateKeys) {
    const entry = asRecord[key];
    if (Array.isArray(entry)) {
      return entry;
    }
  }
  return null;
}

function parseJsonArrayBestEffort(raw: string): unknown[] {
  const stripped = stripCodeFence(raw);
  const inlineStripped = stripInlineCodeFence(stripped);
  const likelyArray = extractLikelyJsonArray(inlineStripped);
  const likelyObject = extractLikelyJsonObject(inlineStripped);

  const attempts = [
    raw.trim(),
    stripped,
    inlineStripped,
    likelyArray,
    repairJson(likelyArray),
    likelyObject,
    repairJson(likelyObject),
  ];

  for (const candidate of attempts) {
    if (!candidate) {
      continue;
    }
    try {
      const parsed = JSON.parse(candidate);
      const asArray = toHarvestArray(parsed);
      if (asArray) {
        return asArray;
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
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as RawHarvestCandidate;
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  const psychologicalShift = typeof raw.psychologicalShift === 'string'
    ? raw.psychologicalShift.trim()
    : '';
  if (!text) {
    return null;
  }

  return {
    id: `harvest_${Date.now()}_${index}`,
    text,
    psychologicalShift,
    tags: sanitizeTags(raw.tags),
    povCharacter: normalizePovCharacter(raw.povCharacter),
    sensoryScore: clampScore(raw.sensoryScore, 0.8),
    controlLossScore: clampScore(raw.controlLossScore, 0.8),
    source: 'uploaded_novel',
    createdAt: nowIso,
  };
}

function countCharsWithoutSpaces(value: string): number {
  return value.replace(/\s+/g, '').length;
}

function isTraditionalText(value: string): boolean {
  return !SIMPLIFIED_MARKERS.test(value);
}

function hasContextDependency(value: string): boolean {
  return CONTEXT_DEPENDENCY_MARKERS.some((marker) => value.includes(marker));
}

function hasAbstractMetaphor(value: string): boolean {
  const lower = value.toLowerCase();
  return ABSTRACT_METAPHOR_MARKERS.some((marker) => lower.includes(marker.toLowerCase()));
}

function isSingleSentence(value: string): boolean {
  const chunks = value
    .split(MULTI_SENTENCE_SPLIT)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return chunks.length <= 1;
}

function isEligibleCandidate(
  entry: HarvestedTemplateCandidate | null
): entry is HarvestedTemplateCandidate {
  if (!entry) {
    return false;
  }
  const shiftChars = countCharsWithoutSpaces(entry.psychologicalShift);
  if (!entry.psychologicalShift || shiftChars < MIN_SHIFT_CHARS || shiftChars > MAX_SHIFT_CHARS) {
    return false;
  }
  if (!isTraditionalText(entry.text) || !isTraditionalText(entry.psychologicalShift)) {
    return false;
  }
  if (!isSingleSentence(entry.text)) {
    return false;
  }
  if (countCharsWithoutSpaces(entry.text) > MAX_TEMPLATE_TEXT_CHARS) {
    return false;
  }
  if (hasContextDependency(entry.text) || hasAbstractMetaphor(entry.text)) {
    return false;
  }
  return Boolean(
    entry.sensoryScore >= MIN_SENSORY_SCORE &&
    entry.controlLossScore >= MIN_CONTROL_LOSS_SCORE &&
    entry.tags.length > 0
  );
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
    .filter(isEligibleCandidate);

  const deduped: HarvestedTemplateCandidate[] = [];
  const seen = new Set<string>();

  for (const item of normalized) {
    const key = `${item.text}||${item.psychologicalShift}`.replace(/\s+/g, ' ').trim().toLowerCase();
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
    throw new Error('No valid sensory templates matched strict harvest rules.');
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
