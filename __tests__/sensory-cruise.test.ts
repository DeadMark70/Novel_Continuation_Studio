import { describe, expect, it } from 'vitest';
import { resolveSensoryCruiseState } from '../lib/sensory-cruise';

describe('sensory-cruise', () => {
  const templates = [
    { id: 't1', name: 'Template A', content: 'A', tags: ['摩擦刺激'], povCharacter: '莉亞' },
    { id: 't2', name: 'Template B', content: 'B', tags: ['摩擦刺激'], povCharacter: '莉亞' },
    { id: 'default', name: 'Default', content: 'Default anchor block', tags: ['溫度刺激'], povCharacter: '通用' },
  ];

  const sensoryAutoTemplateByPhase = {
    chapter1: 'default',
    continuation: 'default',
  };

  it('prioritizes manual sensory anchors over auto mapping and auto template', () => {
    const result = resolveSensoryCruiseState({
      stepId: 'chapter1',
      chapterNumber: 1,
      manualSensoryAnchors: 'Manual anchors',
      autoSensoryMapping: true,
      sensoryAnchorTemplates: templates,
      sensoryAutoTemplateByPhase,
      breakdown: '【第1章】\n【推薦感官標籤】摩擦刺激\n【感官視角重心】莉亞',
    });

    expect(result.source).toBe('manual');
    expect(result.anchors).toBe('Manual anchors');
    expect(result.shouldCarryToNextRun).toBe(true);
  });

  it('uses auto mapping when chapter signal exists', () => {
    const result = resolveSensoryCruiseState({
      stepId: 'continuation',
      chapterNumber: 2,
      autoSensoryMapping: true,
      sensoryAnchorTemplates: templates,
      sensoryAutoTemplateByPhase,
      breakdown: '【第2章】\n【推薦感官標籤】摩擦刺激\n【感官視角重心】莉亞',
      recentlyUsedIds: ['t1'],
      maxAnchors: 2,
    });

    expect(result.source).toBe('autoMapping');
    expect(result.selectedTemplateIds[0]).toBe('t2');
    expect(result.shouldCarryToNextRun).toBe(false);
  });

  it('falls back to phase default template when auto mapping has no signal', () => {
    const result = resolveSensoryCruiseState({
      stepId: 'continuation',
      chapterNumber: 3,
      autoSensoryMapping: true,
      sensoryAnchorTemplates: templates,
      sensoryAutoTemplateByPhase,
      breakdown: '【第3章】\n【推薦感官標籤】無\n【感官視角重心】通用',
      maxAnchors: 2,
    });

    expect(result.source).toBe('autoTemplate');
    expect(result.templateName).toBe('Default');
    expect(result.anchors).toContain('Default anchor block');
  });

  it('returns none when auto mapping is disabled and no default template can be resolved', () => {
    const result = resolveSensoryCruiseState({
      stepId: 'chapter1',
      chapterNumber: 1,
      autoSensoryMapping: false,
      sensoryAnchorTemplates: templates,
      sensoryAutoTemplateByPhase: {
        chapter1: 'missing_template',
        continuation: 'missing_template',
      },
      breakdown: '【第1章】\n【推薦感官標籤】摩擦刺激\n【感官視角重心】莉亞',
    });

    expect(result.source).toBe('none');
    expect(result.anchors).toBeUndefined();
  });
});
