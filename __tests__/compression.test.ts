import {
  buildCompressionSource,
  parseCompressionArtifacts,
  shouldRunCompression,
} from '../lib/compression';

describe('compression helpers', () => {
  it('respects mode and auto threshold', () => {
    expect(shouldRunCompression('on', 1000, 20000)).toBe(true);
    expect(shouldRunCompression('off', 100000, 20000)).toBe(false);
    expect(shouldRunCompression('auto', 19000, 20000)).toBe(false);
    expect(shouldRunCompression('auto', 21000, 20000)).toBe(true);
  });

  it('builds sampled compression source for long inputs', () => {
    const input = 'A'.repeat(30000);
    const result = buildCompressionSource(input, {
      chunkSize: 6000,
      overlap: 400,
      maxSegments: 6,
    });

    expect(result.chunkCount).toBeGreaterThan(1);
    expect(result.sampledChunkCount).toBeLessThanOrEqual(6);
    expect(result.sourceText).toContain('【片段 1/');
  });

  it('parses structured compression output markers', () => {
    const output = [
      '【角色卡】',
      'R1',
      '【風格指南】',
      'S1',
      '【壓縮大綱】',
      'O1',
      '【證據包】',
      'E1',
      '【最終壓縮上下文】',
      'C1',
    ].join('\n');

    const parsed = parseCompressionArtifacts(output);
    expect(parsed.characterCards).toBe('R1');
    expect(parsed.styleGuide).toBe('S1');
    expect(parsed.compressionOutline).toBe('O1');
    expect(parsed.evidencePack).toBe('E1');
    expect(parsed.compressedContext).toBe('C1');
  });
});
