import { describe, expect, it } from 'vitest';
import { applyBreakdownSensoryFallback } from '../lib/breakdown-sensory-fallback';
import type { RankedSensoryTag } from '../lib/sensory-tag-ranking';

const rankedTags: RankedSensoryTag[] = [
  { tag: '摩擦刺激', score: 8.2 },
  { tag: '溫度刺激', score: 7.1 },
  { tag: '壓迫束縛', score: 6.9 },
];

describe('breakdown-sensory-fallback', () => {
  it('injects missing tags and POV fields', () => {
    const content = [
      '【第1章】 起點',
      '【關鍵情節點】安娜在門邊停住呼吸。',
      '',
      '【第2章】 追擊',
      '【推薦感官標籤】聲音反應',
      '【感官視角重心】克莉絲',
    ].join('\n');

    const result = applyBreakdownSensoryFallback({
      content,
      rankedTags,
      templates: [
        {
          id: 't1',
          name: 'ana-template',
          content: '門把冰冷貼住掌心',
          tags: ['溫度刺激', '摩擦刺激'],
          povCharacter: '安娜',
        },
      ],
      chapterRangeStart: 1,
      chapterRangeEnd: 2,
    });

    expect(result.report.repaired).toBe(true);
    expect(result.report.injectedTagCount).toBeGreaterThanOrEqual(1);
    expect(result.report.injectedPovCount).toBeGreaterThanOrEqual(1);
    expect(result.content).toContain('【感官視角重心】安娜');
    expect(result.content).toContain('【推薦感官標籤】');
    expect(result.content).toContain('【推薦感官標籤】聲音反應');
  });

  it('keeps chapters outside range untouched', () => {
    const content = [
      '【第1章】 起點',
      '【關鍵情節點】A',
      '',
      '【第2章】 追擊',
      '【關鍵情節點】B',
    ].join('\n');

    const result = applyBreakdownSensoryFallback({
      content,
      rankedTags,
      templates: [],
      chapterRangeStart: 2,
      chapterRangeEnd: 2,
    });

    const chapter1Slice = result.content.slice(0, result.content.indexOf('【第2章】'));
    expect(chapter1Slice).not.toContain('【推薦感官標籤】');
    expect(chapter1Slice).not.toContain('【感官視角重心】');
  });
});

