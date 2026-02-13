import {
  buildCompressionSource,
  buildEroticCompressionSource,
  extractCompressionSection,
  parseCompressionArtifacts,
  selectEroticBiasedChunks,
  shouldRunCompression,
  validateCompressionSections,
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
      '【成人元素包】',
      'X1',
      '【最終壓縮上下文】',
      'C1',
    ].join('\n');

    const parsed = parseCompressionArtifacts(output);
    expect(parsed.characterCards).toBe('R1');
    expect(parsed.styleGuide).toBe('S1');
    expect(parsed.compressionOutline).toBe('O1');
    expect(parsed.evidencePack).toBe('E1');
    expect(parsed.eroticPack).toBe('X1');
    expect(parsed.compressedContext).toBe('C1');
  });

  it('extracts a single section by markers', () => {
    const output = ['【角色卡】', 'R2', '【風格指南】', 'S2'].join('\n');
    expect(extractCompressionSection(output, ['角色卡'])).toBe('R2');
    expect(extractCompressionSection(output, ['風格指南'])).toBe('S2');
  });

  it('validates composed compression context sections', () => {
    const good = [
      '【角色卡】',
      'A',
      '【風格指南】',
      'B',
      '【壓縮大綱】',
      'C',
      '【證據包】',
      'D',
    ].join('\n');
    const bad = ['【角色卡】', 'A', '【風格指南】', 'B'].join('\n');

    expect(validateCompressionSections(good)).toEqual({ ok: true, missing: [] });
    const badResult = validateCompressionSections(bad);
    expect(badResult.ok).toBe(false);
    expect(badResult.missing).toContain('壓縮大綱');
    expect(badResult.missing).toContain('證據包');
  });

  it('prefers erotic-dense chunks when selecting erotic-biased samples', () => {
    const chunks = [
      '今天他們在街上散步，討論工作安排。',
      '她靠近他的耳邊低語，手指沿著他的肩線慢慢撫過，呼吸急促。',
      '接著回到公司處理一般文件與會議紀錄。',
      '他們在床邊拉扯邊界，權力互動與挑逗持續升溫。',
      '最後一起吃晚餐並規劃明天行程。',
    ];

    const selected = selectEroticBiasedChunks(chunks, 2);
    expect(selected.length).toBe(2);
    expect(selected.some((chunk) => (
      chunk.includes('撫過') ||
      chunk.includes('權力互動') ||
      chunk.includes('挑逗') ||
      chunk.includes('呼吸')
    ))).toBe(true);
  });

  it('builds erotic source by merging representative and erotic-focused chunks', () => {
    const input = [
      '普通劇情片段A。'.repeat(200),
      '親密情節，權力互動與挑逗持續升溫。'.repeat(120),
      '普通劇情片段B。'.repeat(200),
      '她的呼吸、觸碰與慾望描寫推高張力。'.repeat(120),
      '普通劇情片段C。'.repeat(200),
    ].join('\n');

    const result = buildEroticCompressionSource(input, {
      chunkSize: 1200,
      overlap: 100,
      maxSegments: 6,
    });

    expect(result.chunkCount).toBeGreaterThan(1);
    expect(result.sampledChunkCount).toBeGreaterThan(0);
    expect(result.sourceText).toContain('【片段 1/');
  });
});
