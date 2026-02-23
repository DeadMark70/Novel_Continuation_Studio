import { describe, expect, it } from 'vitest';
import { getAutoSensoryAnchors } from '../lib/sensory-mapping';

describe('sensory-mapping', () => {
  it('returns empty result when template pool is empty', () => {
    const result = getAutoSensoryAnchors({
      templates: [],
      breakdown: '【第1章】\n【推薦感官標籤】溫度刺激\n【感官視角重心】莉亞',
      chapterNumber: 1,
    });

    expect(result.anchorText).toBe('');
    expect(result.selectedTemplateIds).toEqual([]);
  });

  it('prefers non-recent templates with matching POV and tags', () => {
    const result = getAutoSensoryAnchors({
      templates: [
        { id: 't1', name: 'A', content: 'A', tags: ['摩擦刺激'], povCharacter: '莉亞' },
        { id: 't2', name: 'B', content: 'B', tags: ['摩擦刺激'], povCharacter: '莉亞' },
        { id: 't3', name: 'C', content: 'C', tags: ['摩擦刺激'], povCharacter: '通用' },
      ],
      breakdown: [
        '【第1章】',
        '【推薦感官標籤】摩擦刺激',
        '【感官視角重心】莉亞',
      ].join('\n'),
      chapterNumber: 1,
      recentlyUsedIds: ['t1'],
      maxAnchors: 2,
    });

    expect(result.selectedTemplateIds).toContain('t2');
    expect(result.selectedTemplateIds).not.toContain('t1');
    expect(result.anchorText.length).toBeGreaterThan(0);
  });

  it('falls back to recent templates when inventory is insufficient', () => {
    const result = getAutoSensoryAnchors({
      templates: [
        { id: 't1', name: 'A', content: 'A', tags: ['溫度刺激'], povCharacter: '莉亞' },
      ],
      breakdown: [
        '【第2章】',
        '【推薦感官標籤】溫度刺激',
        '【感官視角重心】莉亞',
      ].join('\n'),
      chapterNumber: 2,
      recentlyUsedIds: ['t1'],
      maxAnchors: 2,
    });

    expect(result.selectedTemplateIds).toEqual(['t1']);
  });

  it('returns empty when chapter has no sensory signal', () => {
    const result = getAutoSensoryAnchors({
      templates: [
        { id: 't1', name: 'A', content: 'A', tags: ['溫度刺激'], povCharacter: '通用' },
      ],
      breakdown: [
        '【第3章】',
        '【推薦感官標籤】無',
        '【感官視角重心】通用',
      ].join('\n'),
      chapterNumber: 3,
    });

    expect(result.anchorText).toBe('');
    expect(result.selectedTemplateIds).toEqual([]);
  });
});

