import {
  buildBreakdownRanges,
  composeBreakdownContent,
  extractBreakdownMetaSections,
  normalizeBreakdownChunkContent,
} from '../lib/breakdown-phase3';

describe('breakdown phase3 helpers', () => {
  it('builds 5-chapter chunk ranges based on target count', () => {
    expect(buildBreakdownRanges(4)).toEqual([{ start: 1, end: 4 }]);
    expect(buildBreakdownRanges(10)).toEqual([{ start: 1, end: 5 }, { start: 6, end: 10 }]);
    expect(buildBreakdownRanges(12)).toEqual([
      { start: 1, end: 5 },
      { start: 6, end: 10 },
      { start: 11, end: 12 },
    ]);
  });

  it('extracts overview and rules sections from meta output', () => {
    const meta = [
      '【章節框架總覽】',
      'overview line',
      '【張力升級與去重守則】',
      'rules line',
    ].join('\n');
    const result = extractBreakdownMetaSections(meta);
    expect(result.overview).toContain('overview line');
    expect(result.rules).toContain('rules line');
  });

  it('normalizes chunk output by removing table heading', () => {
    const chunk = ['【逐章章節表】', '【第1章】', '...'].join('\n');
    expect(normalizeBreakdownChunkContent(chunk)).toBe(['【第1章】', '...'].join('\n'));
  });

  it('composes final breakdown content with required sections', () => {
    const result = composeBreakdownContent({
      overview: 'overview',
      chapterTable: 'table',
      rules: 'rules',
    });
    expect(result).toContain('【章節框架總覽】');
    expect(result).toContain('【逐章章節表】');
    expect(result).toContain('【張力升級與去重守則】');
  });
});
