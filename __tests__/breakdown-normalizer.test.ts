import { describe, expect, it } from 'vitest';
import {
  getBreakdownChapterBlocks,
  normalizeBreakdownContent,
  parseChineseNumeralToInt,
} from '../lib/breakdown-normalizer';

describe('breakdown-normalizer', () => {
  it('converts chinese numerals to arabic chapter headings', () => {
    const input = [
      '### 第十一章：雨夜',
      '推薦感官標籤：摩擦刺激',
      '感官視角重心：安娜',
    ].join('\n');
    const result = normalizeBreakdownContent(input);
    expect(result.content).toContain('【第11章】 雨夜');
    expect(result.content).toContain('【推薦感官標籤】摩擦刺激');
    expect(result.content).toContain('【感官視角重心】安娜');
    expect(result.report.chineseNumeralConversions).toBeGreaterThan(0);
  });

  it('extracts chapter blocks after normalization', () => {
    const input = [
      '【第1章】A',
      '【第2章】B',
      '【第3章】C',
    ].join('\n');
    const normalized = normalizeBreakdownContent(input).content;
    const blocks = getBreakdownChapterBlocks(normalized);
    expect(blocks.map((entry) => entry.chapterNumber)).toEqual([1, 2, 3]);
  });

  it('parses chinese numeral helper', () => {
    expect(parseChineseNumeralToInt('十')).toBe(10);
    expect(parseChineseNumeralToInt('十一')).toBe(11);
    expect(parseChineseNumeralToInt('二十三')).toBe(23);
    expect(parseChineseNumeralToInt('99')).toBe(99);
  });
});
