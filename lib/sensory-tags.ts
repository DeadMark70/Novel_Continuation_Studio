export const CANONICAL_SENSORY_TAGS = [
  '乳頭刺激',
  '液體釋放',
  '觸感質地',
  '體內感',
  '溫度刺激',
  '聲音反應',
  '失控反應',
  '壓迫束縛',
  '摩擦刺激',
] as const;

const DEFAULT_TEMPLATE_TAG = '感官片段';
const DEFAULT_POV_CHARACTER = '通用';
const CANONICAL_TAG_SET = new Set<string>(CANONICAL_SENSORY_TAGS);
const CJK_RE = /[\u3400-\u9FFF]/;

const TAG_RULES: Array<{ pattern: RegExp; value: (typeof CANONICAL_SENSORY_TAGS)[number] }> = [
  { pattern: /(nipple|teat|areola|breast)/i, value: '乳頭刺激' },
  { pattern: /(fluid|liquid|release|leak|drip|cum|secretion)/i, value: '液體釋放' },
  { pattern: /(texture|slime|sticky|slick|rough|smooth|grit|grain)/i, value: '觸感質地' },
  { pattern: /(internal|somatic|inside|body.?sensation|visceral)/i, value: '體內感' },
  { pattern: /(temperature|cold|freeze|hot|burn|warm|chill)/i, value: '溫度刺激' },
  { pattern: /(sound|squelch|drip|breath|gasp|moan|whimper|pant)/i, value: '聲音反應' },
  { pattern: /(spasm|tremble|shiver|convuls|control.?loss|motor.?loss|slip)/i, value: '失控反應' },
  { pattern: /(pressure|tight|choke|strangle|bind|restraint)/i, value: '壓迫束縛' },
  { pattern: /(friction|rub|grind|scrape)/i, value: '摩擦刺激' },
];

function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function toChineseTagInternal(tag: string, strictCanonicalOnly: boolean): string {
  const trimmed = tag.trim();
  if (!trimmed) {
    return '';
  }

  if (CJK_RE.test(trimmed)) {
    if (CANONICAL_TAG_SET.has(trimmed)) {
      return trimmed;
    }
    return strictCanonicalOnly ? '' : trimmed;
  }

  const normalized = normalizeTag(trimmed);
  for (const rule of TAG_RULES) {
    if (rule.pattern.test(normalized)) {
      return rule.value;
    }
  }

  return strictCanonicalOnly ? '' : DEFAULT_TEMPLATE_TAG;
}

export function isCanonicalSensoryTag(tag: string): boolean {
  return CANONICAL_TAG_SET.has(tag.trim());
}

export function normalizePovCharacter(value: unknown, fallback = DEFAULT_POV_CHARACTER): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized || fallback;
}

export function toChineseSensoryTag(tag: string): string {
  return toChineseTagInternal(tag, false);
}

export function toChineseSensoryTagStrict(tag: string): string {
  return toChineseTagInternal(tag, true);
}

export function sanitizeSensoryTags(value: unknown, maxTags = 8): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const mapped = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => toChineseSensoryTag(entry))
    .filter(Boolean);
  return [...new Set(mapped)].slice(0, maxTags);
}

export function sanitizeSensoryTagsStrict(value: unknown, maxTags = 8): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const mapped = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => toChineseSensoryTagStrict(entry))
    .filter((entry) => isCanonicalSensoryTag(entry));
  return [...new Set(mapped)].slice(0, maxTags);
}

export function buildHarvestTemplateName(tags: string[] | undefined): string {
  const firstTag = tags && tags.length > 0 ? tags[0].trim() : '';
  return `收割-${firstTag || DEFAULT_TEMPLATE_TAG}`;
}
