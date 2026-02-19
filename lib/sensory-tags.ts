const TAG_RULES: Array<{ pattern: RegExp; value: string }> = [
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

const CJK_RE = /[\u3400-\u9FFF]/;

function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function toChineseSensoryTag(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) {
    return '';
  }
  if (CJK_RE.test(trimmed)) {
    return trimmed;
  }
  const normalized = normalizeTag(trimmed);
  for (const rule of TAG_RULES) {
    if (rule.pattern.test(normalized)) {
      return rule.value;
    }
  }
  return '感官片段';
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

export function buildHarvestTemplateName(tags: string[] | undefined): string {
  const firstTag = tags && tags.length > 0 ? tags[0].trim() : '';
  return `收割-${firstTag || '感官片段'}`;
}
