import { describe, expect, it } from 'vitest';
import { validateBreakdownForSensoryMapping } from '../lib/breakdown-validator';

describe('breakdown-validator', () => {
  it('passes with complete chapter range and sensory fields', () => {
    const content = [
      '【第1章】 起點',
      '【關鍵情節點】A',
      '【推薦感官標籤】摩擦刺激、溫度刺激',
      '【感官視角重心】安娜',
      '',
      '【第2章】 對抗',
      '【關鍵情節點】B',
      '【推薦感官標籤】壓迫束縛',
      '【感官視角重心】克莉絲',
      '【去重提醒】保持推進',
    ].join('\n');

    const result = validateBreakdownForSensoryMapping({
      content,
      chapterRangeStart: 1,
      chapterRangeEnd: 2,
      requireSensoryFields: true,
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('fails when chapter count is short and has omissions', () => {
    const content = [
      '【第1章】 起點',
      '【推薦感官標籤】摩擦刺激',
      '【感官視角重心】安娜',
      '',
      '以下省略',
    ].join('\n');

    const result = validateBreakdownForSensoryMapping({
      content,
      chapterRangeStart: 1,
      chapterRangeEnd: 3,
      requireSensoryFields: true,
    });

    expect(result.ok).toBe(false);
    expect(result.missingChapterNumbers).toEqual([2, 3]);
    expect(result.errors.join(' ')).toContain('incomplete markers');
  });

  it('fails on skipped chapter and truncated tail', () => {
    const content = [
      '【第1章】 起點',
      '【推薦感官標籤】摩擦刺激',
      '【感官視角重心】安娜',
      '',
      '【第3章】 失衡',
      '【推薦感官標籤】溫度刺激',
      '【感官視角重心】',
    ].join('\n');

    const result = validateBreakdownForSensoryMapping({
      content,
      chapterRangeStart: 1,
      chapterRangeEnd: 3,
      requireSensoryFields: true,
    });

    expect(result.ok).toBe(false);
    expect(result.missingChapterNumbers).toEqual([2]);
    expect(result.likelyTruncated).toBe(true);
  });
});

