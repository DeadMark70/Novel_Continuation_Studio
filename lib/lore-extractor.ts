import { streamToAsyncIterable } from './llm-client';
import { type GenerateOptions, type GenerationParams } from './llm-types';
import { getLoreExtractionPrompt, getLoreJsonRepairPrompt } from './prompts';
import { estimateTokenCountHeuristic } from './token-estimator';
import {
  type ExtractedLoreItem,
  type LoreCard,
  type LoreCharacterSourceMode,
  type LoreExtractionTarget,
} from './lorebook-types';
import { v4 as uuidv4 } from 'uuid';

type JsonObject = Record<string, unknown>;

const DEFAULT_EXTRACTION_PARAMS: GenerationParams = {
  maxTokens: 1500,
  autoMaxTokens: false,
  temperature: 0.2,
  topP: 0.9,
  topK: 40,
  frequencyPenalty: 0,
  presencePenalty: 0,
  thinkingEnabled: false,
};

const LORE_FIELD_LIMITS = {
  name: 80,
  description: 600,
  personality: 300,
  scenario: 400,
  first_mes: 300,
  mes_example: 800,
} as const;

const MAX_AUTO_MULTIPLE_RESULTS = 3;
const MAX_LLM_REPAIR_ATTEMPTS = 2;

export interface LoreExtractionOptions {
  params?: Partial<GenerationParams>;
  sourceMode?: LoreCharacterSourceMode;
  manualNames?: string[];
  supportedParameters?: string[];
  maxContextTokens?: number;
  maxCompletionTokens?: number;
  repairConfig?: LoreJsonRepairConfig;
}

export interface LoreJsonRepairConfig {
  provider: 'nim' | 'openrouter';
  model: string;
  apiKey: string;
  params?: Partial<GenerationParams>;
  supportedParameters?: string[];
  maxContextTokens?: number;
  maxCompletionTokens?: number;
}

export class LoreExtractionParseError extends Error {
  private static normalizeParseErrorMessage(message: string): string {
    return message.replace(/^Failed to parse extracted JSON:\s*/i, '').trim();
  }

  constructor(
    public readonly parseError: string,
    public readonly rawOutput: string
  ) {
    const normalized = LoreExtractionParseError.normalizeParseErrorMessage(parseError);
    super(`Failed to parse extracted JSON: ${normalized}`);
    this.name = 'LoreExtractionParseError';
    this.parseError = normalized;
  }
}

export function isLoreExtractionParseError(error: unknown): error is LoreExtractionParseError {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const candidate = error as { message?: unknown; rawOutput?: unknown; name?: unknown };
  return (
    typeof candidate.message === 'string' &&
    typeof candidate.rawOutput === 'string' &&
    (candidate.name === 'LoreExtractionParseError' || candidate.message.startsWith('Failed to parse extracted JSON:'))
  );
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeManualNames(manualNames?: string[]): string[] {
  if (!Array.isArray(manualNames)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const name of manualNames) {
    const trimmed = name.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(trimmed);
  }
  return normalized;
}

function normalizeNameForMatch(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/["'`「」『』]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function buildNameMatchKeys(name: string): string[] {
  const normalized = normalizeNameForMatch(name);
  if (!normalized) {
    return [];
  }

  const keys = new Set<string>();
  const push = (value: string) => {
    const key = value.trim();
    if (key) {
      keys.add(key);
    }
  };

  push(normalized);
  push(normalized.replace(/[\(（\[{【<＜《〈「『].*?[\)）\]}】>＞》〉」』]/g, ''));

  for (const segment of normalized.split(/[\/\\|,，、;；]/)) {
    push(segment);
    push(segment.replace(/[\(（\[{【<＜《〈「『].*?[\)）\]}】>＞》〉」』]/g, ''));
  }

  return [...keys];
}

function findManualNameIndex(name: string, manualNames: string[]): number {
  const extractedKeys = buildNameMatchKeys(name);
  if (extractedKeys.length === 0) {
    return -1;
  }

  for (let i = 0; i < manualNames.length; i += 1) {
    const manualKeys = buildNameMatchKeys(manualNames[i]);
    for (const manualKey of manualKeys) {
      for (const extractedKey of extractedKeys) {
        if (
          manualKey === extractedKey ||
          manualKey.includes(extractedKey) ||
          extractedKey.includes(manualKey)
        ) {
          return i;
        }
      }
    }
  }

  return -1;
}

function resolveExtractionParams(input?: Partial<GenerationParams>): GenerationParams {
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  return {
    ...DEFAULT_EXTRACTION_PARAMS,
    ...input,
    maxTokens: Math.max(256, Math.floor(input?.maxTokens ?? DEFAULT_EXTRACTION_PARAMS.maxTokens)),
    temperature: typeof input?.temperature === 'number'
      ? clamp(input.temperature, 0, 2)
      : DEFAULT_EXTRACTION_PARAMS.temperature,
    topP: typeof input?.topP === 'number'
      ? clamp(input.topP, 0, 1)
      : DEFAULT_EXTRACTION_PARAMS.topP,
    topK: typeof input?.topK === 'number' ? input.topK : DEFAULT_EXTRACTION_PARAMS.topK,
    frequencyPenalty: typeof input?.frequencyPenalty === 'number'
      ? input.frequencyPenalty
      : DEFAULT_EXTRACTION_PARAMS.frequencyPenalty,
    presencePenalty: typeof input?.presencePenalty === 'number'
      ? input.presencePenalty
      : DEFAULT_EXTRACTION_PARAMS.presencePenalty,
    thinkingEnabled: Boolean(input?.thinkingEnabled ?? DEFAULT_EXTRACTION_PARAMS.thinkingEnabled),
  };
}

function truncateToMax(value: string | undefined, max: number): string | undefined {
  if (typeof value !== 'string') {
    return value;
  }
  if (value.length <= max) {
    return value;
  }
  return value.slice(0, max);
}

function splitLoreContextIntoChunks(
  contextText: string,
  maxTokens: number,
  maxContextTokens?: number,
  maxCompletionTokens?: number
): string[] {
  const normalized = contextText.trim();
  if (!normalized) {
    return [];
  }

  const reservedPromptTokens = 512;
  const outputTokenBudget = typeof maxCompletionTokens === 'number' && maxCompletionTokens > 0
    ? Math.min(maxTokens, Math.floor(maxCompletionTokens))
    : maxTokens;

  const contextBoundInputBudget = typeof maxContextTokens === 'number' && maxContextTokens > 0
    ? Math.max(512, Math.floor(maxContextTokens) - outputTokenBudget - reservedPromptTokens)
    : undefined;

  const fallbackInputBudget = Math.max(512, Math.min(3500, Math.floor(maxTokens * 2)));
  const inputTokenBudget = contextBoundInputBudget
    ? Math.min(contextBoundInputBudget, fallbackInputBudget)
    : fallbackInputBudget;

  const estimatedTokens = estimateTokenCountHeuristic(normalized);
  const tokenPerChar = estimatedTokens > 0 ? estimatedTokens / normalized.length : 0.25;
  const approxChunkChars = Math.max(
    1200,
    Math.min(16000, Math.floor(inputTokenBudget / Math.max(tokenPerChar, 0.1)))
  );
  if (normalized.length <= approxChunkChars) {
    return [normalized];
  }

  const overlap = Math.max(200, Math.min(1500, Math.floor(approxChunkChars * 0.1)));
  const step = Math.max(500, approxChunkChars - overlap);
  const chunks: string[] = [];

  for (let start = 0; start < normalized.length; start += step) {
    const end = Math.min(normalized.length, start + approxChunkChars);
    chunks.push(normalized.slice(start, end));
    if (end >= normalized.length) {
      break;
    }
  }

  return chunks;
}

function extractJsonPayload(rawResponse: string): unknown {
  const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const fenced = jsonMatch ? jsonMatch[1].trim() : null;
  const raw = rawResponse.trim();

  const candidates = [fenced, raw].filter((value): value is string => Boolean(value));
  let lastError: unknown = null;

  for (const candidate of candidates) {
    const parseCandidates = buildParseCandidates(candidate);
    for (const parseCandidate of parseCandidates) {
      try {
        return JSON.parse(parseCandidate);
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('No valid JSON payload found.');
}

function buildParseCandidates(candidate: string): string[] {
  const options: string[] = [];
  const seen = new Set<string>();
  const pushUnique = (value: string | null) => {
    if (!value) {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    options.push(trimmed);
  };

  pushUnique(candidate);
  pushUnique(extractBalancedJsonSubstring(candidate));

  const repaired = repairJsonLikeText(candidate);
  pushUnique(repaired);
  pushUnique(extractBalancedJsonSubstring(repaired));
  return options;
}

function replaceOutsideQuotedStrings(
  input: string,
  replacer: (char: string) => string
): string {
  let output = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    output += replacer(char);
  }

  return output;
}

function normalizeJsonPunctuationOutsideStrings(input: string): string {
  const punctuationMap: Record<string, string> = {
    '｛': '{',
    '｝': '}',
    '［': '[',
    '］': ']',
    '：': ':',
    '，': ',',
    '＂': '"',
  };

  return replaceOutsideQuotedStrings(input, (char) => punctuationMap[char] ?? char);
}

function normalizeQuotedObjectKeys(input: string): string {
  return input
    .replace(/([{\[,]\s*)[「『]([^「」『』:\n\r]+?)[」』]\s*:/g, '$1"$2":')
    .replace(/"\*{1,2}\s*([A-Za-z_][A-Za-z0-9_]*)\s*\*{1,2}"\s*:/g, '"$1":')
    .replace(/([{\[,]\s*)([A-Za-z_][A-Za-z0-9_]*)"\s*:/g, '$1"$2":');
}

function mergeConcatenatedJsonStrings(input: string): string {
  const concatPattern = /"((?:\\.|[^"\\])*)"\s*\+\s*"((?:\\.|[^"\\])*)"/g;
  let output = input;

  for (let i = 0; i < 20; i += 1) {
    const next = output.replace(concatPattern, (_, left: string, right: string) => {
      let leftValue = left;
      let rightValue = right;
      try {
        leftValue = JSON.parse(`"${left}"`) as string;
      } catch {}
      try {
        rightValue = JSON.parse(`"${right}"`) as string;
      } catch {}
      return JSON.stringify(`${leftValue}${rightValue}`);
    });

    if (next === output) {
      break;
    }
    output = next;
  }

  return output;
}

function normalizeKnownStringFieldValues(input: string): string {
  const fields = [
    'type',
    'name',
    'description',
    'personality',
    'scenario',
    'first_mes',
    'mes_example',
    '_mes',
    '_example',
  ];
  const fieldPattern = new RegExp(
    `("(${fields.join('|')})"\\s*:\\s*)([^"\\[{][^,}\\]]*)(?=\\s*[,}\\]])`,
    'gi'
  );

  return input.replace(fieldPattern, (_, prefix: string, __: string, rawValue: string) => {
    let value = rawValue.trim();

    if (!value) {
      return `${prefix}${JSON.stringify('')}`;
    }

    if (value.startsWith('"') || value.startsWith('{') || value.startsWith('[')) {
      return `${prefix}${value}`;
    }

    const cjkWrappedWithNoteMatch = value.match(/^[「『](.*?)[」』]\s*[\(（]([^()\n\r]*?)[\)）]$/);
    if (cjkWrappedWithNoteMatch) {
      value = `${cjkWrappedWithNoteMatch[1]}（${cjkWrappedWithNoteMatch[2]}）`;
      return `${prefix}${JSON.stringify(value)}`;
    }

    const cjkWrappedMatch = value.match(/^[「『](.*?)[」』]$/);
    if (cjkWrappedMatch) {
      value = cjkWrappedMatch[1];
      return `${prefix}${JSON.stringify(value)}`;
    }

    return `${prefix}${JSON.stringify(value)}`;
  });
}

function removeStandaloneNoteEntries(input: string): string {
  return input.replace(/,\s*"[*_]*註[^"\n\r]*"\s*,/g, ',');
}

function removeDanglingStandaloneQuoteLines(input: string): string {
  // Common malformed pattern from LLM output:
  // a stray standalone `"` line before `},` / `]`.
  return input.replace(/^\s*"\s*$(?:\r?\n)?/gm, '');
}

function repairJsonLikeText(input: string): string {
  let output = normalizeJsonPunctuationOutsideStrings(input)
    .replace(/[“”]/g, '"');

  output = normalizeQuotedObjectKeys(output);
  output = normalizeKnownStringFieldValues(output);
  output = mergeConcatenatedJsonStrings(output);
  output = removeStandaloneNoteEntries(output);
  output = removeDanglingStandaloneQuoteLines(output);

  // Normalize patterns like: "name": "XXX"（備註）,
  output = output.replace(
    /"((?:\\.|[^"\\])*)"\s*[\(（]([^()\n\r]*?)[\)）](?=\s*[,}\]])/g,
    (_, value: string, note: string) => `"${value}（${note}）"`
  );

  return repairInvalidEscapes(output);
}

function repairInvalidEscapes(input: string): string {
  let output = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (!inString) {
      output += char;
      if (char === '"') {
        inString = true;
      }
      continue;
    }

    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      const next = input[i + 1];
      if (!next) {
        output += '\\\\';
        continue;
      }
      if (/["\\/bfnrtu]/.test(next)) {
        output += '\\';
        escaped = true;
        continue;
      }
      output += '\\\\';
      continue;
    }

    output += char;
    if (char === '"') {
      inString = false;
    }
  }

  return output;
}

function extractBalancedJsonSubstring(input: string): string | null {
  const objectStart = input.indexOf('{');
  const arrayStart = input.indexOf('[');
  const hasObject = objectStart >= 0;
  const hasArray = arrayStart >= 0;

  if (!hasObject && !hasArray) {
    return null;
  }

  let start = -1;
  let opening = '';
  if (hasObject && hasArray) {
    if (objectStart < arrayStart) {
      start = objectStart;
      opening = '{';
    } else {
      start = arrayStart;
      opening = '[';
    }
  } else if (hasObject) {
    start = objectStart;
    opening = '{';
  } else {
    start = arrayStart;
    opening = '[';
  }

  const closing = opening === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < input.length; i += 1) {
    const char = input[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === opening) {
      depth += 1;
      continue;
    }

    if (char === closing) {
      depth -= 1;
      if (depth === 0) {
        return input.slice(start, i + 1);
      }
    }
  }

  return null;
}

function normalizeExtractedItem(item: unknown): ExtractedLoreItem {
  if (!isJsonObject(item)) {
    throw new Error('Each extracted item must be a JSON object.');
  }

  if ('cards' in item) {
    throw new Error('Legacy payload format { "cards": [...] } is not supported.');
  }

  const name = asOptionalString(item.name)?.trim();
  if (!name) {
    throw new Error('Each extracted item must include a non-empty "name".');
  }

  return {
    type: asOptionalString(item.type),
    name: truncateToMax(name, LORE_FIELD_LIMITS.name) ?? name,
    description: truncateToMax(asOptionalString(item.description), LORE_FIELD_LIMITS.description),
    personality: truncateToMax(asOptionalString(item.personality), LORE_FIELD_LIMITS.personality),
    scenario: truncateToMax(asOptionalString(item.scenario), LORE_FIELD_LIMITS.scenario),
    first_mes: truncateToMax(
      asOptionalString(item.first_mes) ?? asOptionalString(item._mes),
      LORE_FIELD_LIMITS.first_mes
    ),
    mes_example: truncateToMax(
      asOptionalString(item.mes_example) ?? asOptionalString(item._example),
      LORE_FIELD_LIMITS.mes_example
    ),
  };
}

function normalizePayloadByTarget(
  payload: unknown,
  target: LoreExtractionTarget
): ExtractedLoreItem[] {
  const rawItems = Array.isArray(payload)
    ? payload
    : isJsonObject(payload)
      ? [payload]
      : null;

  if (!rawItems) {
    throw new Error('Parsed extraction must be a JSON object or JSON array.');
  }

  const items = rawItems.map(normalizeExtractedItem);
  if (items.length === 0) {
    throw new Error('Parsed extraction is empty.');
  }

  if (target === 'multipleCharacters') {
    return items;
  }

  if (items.length > 1) {
    console.warn(`[LoreExtractor] "${target}" target received ${items.length} items. Keeping the first item only.`);
  }

  return [items[0]];
}

function scoreExtractedItem(item: ExtractedLoreItem): number {
  return [
    item.description,
    item.personality,
    item.scenario,
    item.first_mes,
    item.mes_example,
  ].reduce((total, value) => total + (value?.length ?? 0), 0);
}

function dedupeExtractedItems(items: ExtractedLoreItem[]): ExtractedLoreItem[] {
  const byKey = new Map<string, ExtractedLoreItem>();
  for (const item of items) {
    const typeKey = (item.type ?? 'character').toLowerCase();
    const key = `${typeKey}:${item.name.toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing || scoreExtractedItem(item) >= scoreExtractedItem(existing)) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()];
}

function filterItemsByManualNames(
  items: ExtractedLoreItem[],
  target: LoreExtractionTarget,
  sourceMode: LoreCharacterSourceMode,
  manualNames: string[]
): ExtractedLoreItem[] {
  if (target === 'worldLore' || sourceMode !== 'manualList' || manualNames.length === 0) {
    return items;
  }

  const matched: Array<{ item: ExtractedLoreItem; manualIndex: number }> = [];
  for (const item of items) {
    const manualIndex = findManualNameIndex(item.name, manualNames);
    if (manualIndex >= 0) {
      matched.push({ item, manualIndex });
    }
  }

  if (target !== 'multipleCharacters') {
    return matched.map((entry) => entry.item);
  }

  // Strict manual-list mode for multi-character extraction:
  // keep only requested names, dedupe per requested slot, and preserve manual list order.
  const byManualIndex = new Map<number, ExtractedLoreItem>();
  for (const entry of matched) {
    const existing = byManualIndex.get(entry.manualIndex);
    if (!existing || scoreExtractedItem(entry.item) > scoreExtractedItem(existing)) {
      byManualIndex.set(entry.manualIndex, entry.item);
    }
  }

  return manualNames
    .map((_, index) => byManualIndex.get(index))
    .filter((item): item is ExtractedLoreItem => Boolean(item));
}

function resolveCardType(item: ExtractedLoreItem, target: LoreExtractionTarget): 'character' | 'world' {
  if (target === 'worldLore') {
    return 'world';
  }
  return item.type === 'world' ? 'world' : 'character';
}

function mapItemsToLoreCards(items: ExtractedLoreItem[], target: LoreExtractionTarget): LoreCard[] {
  const timestamp = Date.now();
  return items.map((data, index) => ({
    id: uuidv4(),
    novelId: '',
    type: resolveCardType(data, target),
    name: data.name,
    coreData: {
      description: data.description || '',
      personality: data.personality || '',
      scenario: data.scenario || '',
      first_mes: data.first_mes || '',
      mes_example: data.mes_example || '',
    },
    createdAt: timestamp + index,
    updatedAt: timestamp + index,
  }));
}

function finalizeItemsByTarget(
  items: ExtractedLoreItem[],
  target: LoreExtractionTarget,
  sourceMode: LoreCharacterSourceMode
): ExtractedLoreItem[] {
  if (items.length === 0) {
    throw new Error('No extractable lore entities found.');
  }

  if (target === 'multipleCharacters') {
    if (sourceMode === 'manualList') {
      return items;
    }
    if (items.length <= MAX_AUTO_MULTIPLE_RESULTS) {
      return items;
    }
    return [...items]
      .sort((a, b) => scoreExtractedItem(b) - scoreExtractedItem(a))
      .slice(0, MAX_AUTO_MULTIPLE_RESULTS);
  }

  const best = items.reduce((winner, candidate) => {
    if (!winner) {
      return candidate;
    }
    return scoreExtractedItem(candidate) > scoreExtractedItem(winner) ? candidate : winner;
  }, items[0]);

  return [best];
}

async function readStreamToRawText(stream: AsyncGenerator<string, void, unknown>): Promise<string> {
  let rawResponse = '';
  for await (const chunk of stream) {
    if (chunk) {
      rawResponse += chunk;
    }
  }
  return rawResponse;
}

function hasUsableRepairConfig(config?: LoreJsonRepairConfig): config is LoreJsonRepairConfig {
  return Boolean(
    config &&
    config.provider &&
    config.model?.trim() &&
    config.apiKey?.trim()
  );
}

function buildGenerationOptionsFromParams(
  params: Partial<GenerationParams> | undefined,
  metadata?: Pick<LoreJsonRepairConfig, 'supportedParameters' | 'maxContextTokens' | 'maxCompletionTokens'>
): GenerateOptions {
  const resolved = resolveExtractionParams(params);
  return {
    maxTokens: resolved.autoMaxTokens ? undefined : resolved.maxTokens,
    autoMaxTokens: resolved.autoMaxTokens,
    temperature: resolved.temperature,
    topP: resolved.topP,
    topK: resolved.topK,
    frequencyPenalty: resolved.frequencyPenalty,
    presencePenalty: resolved.presencePenalty,
    seed: resolved.seed,
    enableThinking: false,
    thinkingSupported: false,
    supportedParameters: metadata?.supportedParameters,
    maxContextTokens: metadata?.maxContextTokens,
    maxCompletionTokens: metadata?.maxCompletionTokens,
  };
}

async function repairJsonWithLlm(
  rawOutput: string,
  target: LoreExtractionTarget,
  parseErrorMessage: string,
  sourceMode: LoreCharacterSourceMode,
  manualNames: string[],
  repairConfig?: LoreJsonRepairConfig
): Promise<string | null> {
  if (!hasUsableRepairConfig(repairConfig)) {
    return null;
  }

  const systemPrompt = getLoreJsonRepairPrompt(target, {
    sourceMode,
    characterNames: manualNames,
  });
  const userPrompt = [
    '請修復下列輸出為可解析 JSON，且符合目標 schema。',
    `解析錯誤：${parseErrorMessage}`,
    '原始輸出：',
    rawOutput,
  ].join('\n\n');

  const stream = streamToAsyncIterable(
    repairConfig.provider,
    repairConfig.model,
    repairConfig.apiKey,
    systemPrompt,
    userPrompt,
    buildGenerationOptionsFromParams(repairConfig.params, {
      supportedParameters: repairConfig.supportedParameters,
      maxContextTokens: repairConfig.maxContextTokens,
      maxCompletionTokens: repairConfig.maxCompletionTokens,
    })
  );

  const repaired = await readStreamToRawText(stream);
  return repaired.trim() ? repaired : null;
}

export function parseLoreCardsFromRawJson(
  rawOutput: string,
  target: LoreExtractionTarget,
  options?: Pick<LoreExtractionOptions, 'sourceMode' | 'manualNames'>
): LoreCard[] {
  const sourceMode = options?.sourceMode ?? 'autoDetect';
  const manualNames = normalizeManualNames(options?.manualNames);

  try {
    const parsedPayload = extractJsonPayload(rawOutput);
    const normalizedItems = normalizePayloadByTarget(parsedPayload, target);
    const filtered = filterItemsByManualNames(normalizedItems, target, sourceMode, manualNames);
    const deduped = dedupeExtractedItems(filtered);
    const finalized = finalizeItemsByTarget(deduped, target, sourceMode);
    return mapItemsToLoreCards(finalized, target);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown parse error';
    throw new LoreExtractionParseError(message, rawOutput);
  }
}

export async function parseLoreCardsFromRawJsonWithLlmRepair(
  rawOutput: string,
  target: LoreExtractionTarget,
  options?: Pick<LoreExtractionOptions, 'sourceMode' | 'manualNames' | 'repairConfig'>
): Promise<LoreCard[]> {
  try {
    return parseLoreCardsFromRawJson(rawOutput, target, options);
  } catch (err: unknown) {
    if (!isLoreExtractionParseError(err)) {
      throw err;
    }

    const sourceMode = options?.sourceMode ?? 'autoDetect';
    const manualNames = normalizeManualNames(options?.manualNames);
    if (!hasUsableRepairConfig(options?.repairConfig)) {
      throw new LoreExtractionParseError(
        `${err.parseError} (LLM repair unavailable: missing provider/model/apiKey)`,
        rawOutput
      );
    }

    let currentRawOutput = rawOutput;
    let currentParseError = err.parseError;
    let lastParseError: LoreExtractionParseError = err;

    for (let attempt = 1; attempt <= MAX_LLM_REPAIR_ATTEMPTS; attempt += 1) {
      const repaired = await repairJsonWithLlm(
        currentRawOutput,
        target,
        `${currentParseError} (retry parse repair attempt ${attempt}/${MAX_LLM_REPAIR_ATTEMPTS})`,
        sourceMode,
        manualNames,
        options?.repairConfig
      );

      if (!repaired) {
        break;
      }

      try {
        return parseLoreCardsFromRawJson(repaired, target, options);
      } catch (repairErr: unknown) {
        if (!isLoreExtractionParseError(repairErr)) {
          throw repairErr;
        }
        lastParseError = repairErr;
        currentParseError = repairErr.parseError;
        currentRawOutput = repaired;
      }
    }

    throw lastParseError;
  }
}

export async function extractLoreFromText(
  contextText: string,
  provider: 'nim' | 'openrouter',
  model: string,
  apiKey: string,
  target: LoreExtractionTarget = 'singleCharacter',
  options?: LoreExtractionOptions
): Promise<LoreCard[]> {
  const sourceMode = options?.sourceMode ?? 'autoDetect';
  const manualNames = normalizeManualNames(options?.manualNames);
  const params = resolveExtractionParams(options?.params);
  const chunks = splitLoreContextIntoChunks(
    contextText,
    params.maxTokens,
    options?.maxContextTokens,
    options?.maxCompletionTokens
  );

  if (chunks.length === 0) {
    return [];
  }

  const systemPrompt = getLoreExtractionPrompt(target, {
    sourceMode,
    characterNames: manualNames,
  });

  const aggregatedItems: ExtractedLoreItem[] = [];
  const generationOptions = buildGenerationOptionsFromParams(params, {
    supportedParameters: options?.supportedParameters,
    maxContextTokens: options?.maxContextTokens,
    maxCompletionTokens: options?.maxCompletionTokens,
  });

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
    const chunk = chunks[chunkIndex];
    const userPrompt = `Context Text to Analyze (Chunk ${chunkIndex + 1}/${chunks.length}):\n${chunk}`;
    const stream = streamToAsyncIterable(
      provider,
      model,
      apiKey,
      systemPrompt,
      userPrompt,
      generationOptions
    );

    const rawResponse = await readStreamToRawText(stream);

    try {
      const parsedPayload = extractJsonPayload(rawResponse);
      aggregatedItems.push(...normalizePayloadByTarget(parsedPayload, target));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown parse error';
      const repairedRaw = await repairJsonWithLlm(
        rawResponse,
        target,
        `${message} (chunk ${chunkIndex + 1}/${chunks.length})`,
        sourceMode,
        manualNames,
        options?.repairConfig
      );

      if (repairedRaw) {
        try {
          const repairedPayload = extractJsonPayload(repairedRaw);
          aggregatedItems.push(...normalizePayloadByTarget(repairedPayload, target));
          continue;
        } catch (repairErr: unknown) {
          const repairMessage = repairErr instanceof Error ? repairErr.message : 'Unknown parse error';
          throw new LoreExtractionParseError(
            `${repairMessage} (chunk ${chunkIndex + 1}/${chunks.length}, after LLM repair)`,
            repairedRaw
          );
        }
      }

      throw new LoreExtractionParseError(`${message} (chunk ${chunkIndex + 1}/${chunks.length})`, rawResponse);
    }
  }

  const filtered = filterItemsByManualNames(aggregatedItems, target, sourceMode, manualNames);
  if (sourceMode === 'manualList' && target !== 'worldLore' && manualNames.length > 0 && filtered.length === 0) {
    throw new Error('No extracted entities matched the manual character list.');
  }

  const deduped = dedupeExtractedItems(filtered);
  const finalized = finalizeItemsByTarget(deduped, target, sourceMode);
  return mapItemsToLoreCards(finalized, target);
}
