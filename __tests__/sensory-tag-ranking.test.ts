import { describe, expect, it } from 'vitest';
import {
  rankInjectableSensoryTags,
  sanitizeSensoryTagUsageMap,
} from '../lib/sensory-tag-ranking';

describe('sensory-tag-ranking', () => {
  it('ranks tags with usage + recency + POV signals and obeys limit', () => {
    const now = Date.now();
    const ranked = rankInjectableSensoryTags({
      templates: [
        {
          id: 't1',
          name: 'ana',
          content: '掌心擦過牆面',
          tags: ['摩擦刺激', '溫度刺激'],
          povCharacter: '安娜',
        },
        {
          id: 't2',
          name: 'generic',
          content: '呼吸卡在喉間',
          tags: ['聲音反應'],
          povCharacter: '通用',
        },
      ],
      usageMap: {
        溫度刺激: { count: 20, lastUsedAt: now, byPov: { 安娜: 8 } },
        摩擦刺激: { count: 2, lastUsedAt: now - 1000 },
      },
      povHints: ['安娜'],
      recentTemplateIds: ['t1'],
      limit: 3,
    });

    expect(ranked.length).toBe(3);
    expect(ranked[0].tag).toBe('溫度刺激');
    expect(ranked.map((entry) => entry.tag)).toContain('摩擦刺激');
  });

  it('sanitizes invalid usage map entries', () => {
    const sanitized = sanitizeSensoryTagUsageMap({
      notCanonical: { count: 4, lastUsedAt: Date.now() },
      溫度刺激: { count: 5, lastUsedAt: Date.now(), byPov: { 安娜: 2, 通用: 1 } },
      摩擦刺激: { count: -1, lastUsedAt: Date.now() },
    });

    expect(Object.keys(sanitized)).toEqual(['溫度刺激']);
    expect(sanitized.溫度刺激.count).toBe(5);
    expect(sanitized.溫度刺激.byPov?.安娜).toBe(2);
  });
});

