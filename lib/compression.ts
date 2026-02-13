export type CompressionMode = 'auto' | 'on' | 'off';

export interface CompressionArtifacts {
  characterCards: string;
  styleGuide: string;
  compressionOutline: string;
  evidencePack: string;
  eroticPack: string;
  compressedContext: string;
}

export interface CompressionMeta {
  sourceChars: number;
  compressedChars: number;
  ratio: number;
  chunkCount: number;
  generatedAt: number;
  skipped?: boolean;
  reason?: string;
  pipelineVersion?: string;
  taskStatus?: Record<string, 'ok' | 'retry' | 'fallback' | 'failed'>;
  taskDurationsMs?: Record<string, number>;
  synthesisFallback?: boolean;
}

export interface CompressionSourceConfig {
  chunkSize: number;
  overlap: number;
  maxSegments: number;
}

export type CompressionTaskId =
  | 'roleCards'
  | 'styleGuide'
  | 'plotLedger'
  | 'evidencePack'
  | 'eroticPack'
  | 'synthesis';

export const DEFAULT_COMPRESSION_MODE: CompressionMode = 'auto';
export const DEFAULT_COMPRESSION_AUTO_THRESHOLD = 20000;
export const DEFAULT_COMPRESSION_CHUNK_SIZE = 6000;
export const DEFAULT_COMPRESSION_CHUNK_OVERLAP = 400;
export const DEFAULT_COMPRESSION_EVIDENCE_SEGMENTS = 10;
export const DEFAULT_COMPRESSION_PIPELINE_PARALLELISM = 4;
export const DEFAULT_COMPRESSION_ENABLE_SYNTHESIS = true;
export const DEFAULT_COMPRESSION_EROTIC_SEGMENTS = 6;

const SECTION_MARKER = /【[^】]+】/g;
const EROTIC_KEYWORDS = [
  '親密',
  '情慾',
  '慾望',
  '挑逗',
  '喘息',
  '呻吟',
  '吻',
  '擁抱',
  '撫摸',
  '觸碰',
  '服從',
  '支配',
  '束縛',
  '調教',
  '羞恥',
  '快感',
  '高潮',
  '濕熱',
  '床',
  '身體',
  '肉體',
  '性',
];

function clampPositive(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

function clampSegmentCount(value: number): number {
  const safe = clampPositive(value, DEFAULT_COMPRESSION_EVIDENCE_SEGMENTS);
  return Math.max(4, Math.min(16, safe));
}

function selectRepresentativeIndices(length: number, max: number): number[] {
  if (length <= 0) {
    return [];
  }
  if (max <= 1 || length === 1) {
    return [0];
  }
  if (length <= max) {
    return Array.from({ length }, (_, index) => index);
  }

  const indices: number[] = [];
  const lastIndex = length - 1;
  const step = lastIndex / (max - 1);
  for (let i = 0; i < max; i += 1) {
    indices.push(Math.round(i * step));
  }
  return Array.from(new Set(indices));
}

function extractByMarkers(output: string, labels: string[]): string {
  for (const label of labels) {
    const marker = `【${label}】`;
    const start = output.indexOf(marker);
    if (start === -1) {
      continue;
    }
    const bodyStart = start + marker.length;
    const tail = output.slice(bodyStart);
    const nextMarkerIndex = tail.search(SECTION_MARKER);
    if (nextMarkerIndex === -1) {
      return tail.trim();
    }
    return tail.slice(0, nextMarkerIndex).trim();
  }
  return '';
}

export function extractCompressionSection(output: string, labels: string[]): string {
  return extractByMarkers(output, labels);
}

export function shouldRunCompression(
  mode: CompressionMode,
  sourceChars: number,
  autoThreshold: number
): boolean {
  if (mode === 'on') {
    return true;
  }
  if (mode === 'off') {
    return false;
  }
  const safeThreshold = clampPositive(autoThreshold, DEFAULT_COMPRESSION_AUTO_THRESHOLD);
  return sourceChars > safeThreshold;
}

export function splitIntoChunks(
  text: string,
  chunkSize: number,
  overlap: number
): string[] {
  const safeChunkSize = clampPositive(chunkSize, DEFAULT_COMPRESSION_CHUNK_SIZE);
  const safeOverlap = Math.max(0, Math.min(clampPositive(overlap, DEFAULT_COMPRESSION_CHUNK_OVERLAP), safeChunkSize - 1));
  const step = Math.max(1, safeChunkSize - safeOverlap);

  const chunks: string[] = [];
  let index = 0;

  while (index < text.length) {
    const end = Math.min(text.length, index + safeChunkSize);
    const chunk = text.slice(index, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    if (end >= text.length) {
      break;
    }
    index += step;
  }

  return chunks;
}

export function selectRepresentativeChunks(chunks: string[], maxSegments: number): string[] {
  if (chunks.length <= maxSegments) {
    return chunks;
  }

  const max = clampSegmentCount(maxSegments);
  return selectRepresentativeIndices(chunks.length, max).map((index) => chunks[index]);
}

function scoreEroticDensity(chunk: string): number {
  if (!chunk.trim()) {
    return 0;
  }
  const normalized = chunk.toLowerCase();
  let score = 0;

  for (const keyword of EROTIC_KEYWORDS) {
    const matches = normalized.match(new RegExp(keyword, 'gi'));
    if (matches) {
      score += matches.length;
    }
  }

  // Lightweight style hints: dialogue-heavy intimate scenes and body-focused narration.
  const quoteCount = (chunk.match(/[「」『』“”"']/g) || []).length;
  const sentenceCount = Math.max(1, (chunk.match(/[。！？!?]/g) || []).length);
  const quoteDensity = quoteCount / sentenceCount;
  if (quoteDensity >= 1.5) {
    score += 1;
  }

  return score;
}

export function selectEroticBiasedChunks(chunks: string[], maxSegments: number): string[] {
  const max = Math.max(1, Math.floor(maxSegments));
  if (chunks.length <= max) {
    return chunks;
  }

  const scored = chunks
    .map((chunk, index) => ({ index, score: scoreEroticDensity(chunk) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.index - b.index;
    });

  const selectedIndices = new Set<number>(scored.slice(0, max).map((entry) => entry.index));
  if (selectedIndices.size < max) {
    const representativeIndices = selectRepresentativeIndices(chunks.length, max);
    for (const index of representativeIndices) {
      selectedIndices.add(index);
      if (selectedIndices.size >= max) {
        break;
      }
    }
  }

  return Array.from(selectedIndices)
    .sort((a, b) => a - b)
    .slice(0, max)
    .map((index) => chunks[index]);
}

export function buildCompressionSource(
  text: string,
  config: CompressionSourceConfig
): { sourceText: string; chunkCount: number; sampledChunkCount: number } {
  const chunks = splitIntoChunks(text, config.chunkSize, config.overlap);
  const sampled = selectRepresentativeChunks(chunks, config.maxSegments);

  const sourceText = sampled
    .map((chunk, index) => `【片段 ${index + 1}/${sampled.length}】\n${chunk}`)
    .join('\n\n---\n\n');

  return {
    sourceText,
    chunkCount: chunks.length,
    sampledChunkCount: sampled.length,
  };
}

export function buildEroticCompressionSource(
  text: string,
  config: CompressionSourceConfig,
  eroticSegments: number = DEFAULT_COMPRESSION_EROTIC_SEGMENTS
): { sourceText: string; chunkCount: number; sampledChunkCount: number; representativeCount: number; eroticCount: number } {
  const chunks = splitIntoChunks(text, config.chunkSize, config.overlap);
  const totalSegments = clampSegmentCount(config.maxSegments);
  const eroticTarget = Math.max(2, Math.min(totalSegments - 1, clampSegmentCount(eroticSegments)));
  const representativeTarget = Math.max(1, totalSegments - eroticTarget);

  const representative = selectRepresentativeChunks(chunks, representativeTarget);
  const eroticFocused = selectEroticBiasedChunks(chunks, eroticTarget);
  const merged = Array.from(new Set([...representative, ...eroticFocused])).slice(0, totalSegments);

  const sampled = merged.length > 0 ? merged : selectRepresentativeChunks(chunks, totalSegments);
  const sourceText = sampled
    .map((chunk, index) => `【片段 ${index + 1}/${sampled.length}】\n${chunk}`)
    .join('\n\n---\n\n');

  return {
    sourceText,
    chunkCount: chunks.length,
    sampledChunkCount: sampled.length,
    representativeCount: representative.length,
    eroticCount: eroticFocused.length,
  };
}

export function buildCompressedContext(artifacts: Omit<CompressionArtifacts, 'compressedContext'>): string {
  const sections = [
    artifacts.characterCards.trim() ? `【角色卡】\n${artifacts.characterCards.trim()}` : '',
    artifacts.styleGuide.trim() ? `【風格指南】\n${artifacts.styleGuide.trim()}` : '',
    artifacts.compressionOutline.trim() ? `【壓縮大綱】\n${artifacts.compressionOutline.trim()}` : '',
    artifacts.evidencePack.trim() ? `【證據包】\n${artifacts.evidencePack.trim()}` : '',
    artifacts.eroticPack.trim() ? `【成人元素包】\n${artifacts.eroticPack.trim()}` : '',
  ].filter(Boolean);

  return sections.join('\n\n');
}

export function validateCompressionSections(text: string): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!extractByMarkers(text, ['角色卡', 'Character Cards'])) {
    missing.push('角色卡');
  }
  if (!extractByMarkers(text, ['風格指南', 'Style Guide'])) {
    missing.push('風格指南');
  }
  if (!extractByMarkers(text, ['壓縮大綱', 'Compression Outline'])) {
    missing.push('壓縮大綱');
  }
  if (!extractByMarkers(text, ['證據包', 'Evidence Pack'])) {
    missing.push('證據包');
  }
  return { ok: missing.length === 0, missing };
}

export function parseCompressionArtifacts(output: string): CompressionArtifacts {
  const characterCards = extractByMarkers(output, ['角色卡', 'Character Cards']);
  const styleGuide = extractByMarkers(output, ['風格指南', 'Style Guide']);
  const compressionOutline = extractByMarkers(output, ['壓縮大綱', 'Compression Outline']);
  const evidencePack = extractByMarkers(output, ['證據包', 'Evidence Pack']);
  const eroticPack = extractByMarkers(output, ['成人元素包', 'Erotic Pack', '情色元素包']);
  const directCompressedContext = extractByMarkers(output, ['最終壓縮上下文', 'Compressed Context', '壓縮上下文']);

  const synthesized = buildCompressedContext({
    characterCards,
    styleGuide,
    compressionOutline,
    evidencePack,
    eroticPack,
  });

  const compressedContext = directCompressedContext || synthesized || output.trim();

  return {
    characterCards,
    styleGuide,
    compressionOutline,
    evidencePack,
    eroticPack,
    compressedContext,
  };
}
