export type CompressionMode = 'auto' | 'on' | 'off';

export interface CompressionArtifacts {
  characterCards: string;
  styleGuide: string;
  compressionOutline: string;
  evidencePack: string;
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
  | 'synthesis';

export const DEFAULT_COMPRESSION_MODE: CompressionMode = 'auto';
export const DEFAULT_COMPRESSION_AUTO_THRESHOLD = 20000;
export const DEFAULT_COMPRESSION_CHUNK_SIZE = 6000;
export const DEFAULT_COMPRESSION_CHUNK_OVERLAP = 400;
export const DEFAULT_COMPRESSION_EVIDENCE_SEGMENTS = 10;
export const DEFAULT_COMPRESSION_PIPELINE_PARALLELISM = 4;
export const DEFAULT_COMPRESSION_ENABLE_SYNTHESIS = true;

const SECTION_MARKER = /【[^】]+】/g;

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

  const selected: string[] = [];
  const max = clampSegmentCount(maxSegments);
  const lastIndex = chunks.length - 1;
  const step = lastIndex / (max - 1);

  for (let i = 0; i < max; i += 1) {
    const pick = Math.round(i * step);
    selected.push(chunks[pick]);
  }

  return selected;
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

export function buildCompressedContext(artifacts: Omit<CompressionArtifacts, 'compressedContext'>): string {
  const sections = [
    artifacts.characterCards.trim() ? `【角色卡】\n${artifacts.characterCards.trim()}` : '',
    artifacts.styleGuide.trim() ? `【風格指南】\n${artifacts.styleGuide.trim()}` : '',
    artifacts.compressionOutline.trim() ? `【壓縮大綱】\n${artifacts.compressionOutline.trim()}` : '',
    artifacts.evidencePack.trim() ? `【證據包】\n${artifacts.evidencePack.trim()}` : '',
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
  const directCompressedContext = extractByMarkers(output, ['最終壓縮上下文', 'Compressed Context', '壓縮上下文']);

  const synthesized = buildCompressedContext({
    characterCards,
    styleGuide,
    compressionOutline,
    evidencePack,
  });

  const compressedContext = directCompressedContext || synthesized || output.trim();

  return {
    characterCards,
    styleGuide,
    compressionOutline,
    evidencePack,
    compressedContext,
  };
}
