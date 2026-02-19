import {
  buildSensoryTemplateHarvestPrompt,
  parseHarvestCandidates,
} from '../lib/sensory-template-harvest';

describe('sensory-template-harvest', () => {
  it('parses strict JSON object arrays', () => {
    const output = JSON.stringify([
      {
        text: 'Ice-cold slime slid across her skin and left a sticky film.',
        tags: ['cold', 'slimy'],
        sensoryScore: 0.95,
        controlLossScore: 0.82,
      },
      {
        text: 'Her knees buckled and her breath broke into short, shaky gasps.',
        tags: ['breath', 'spasm'],
        sensoryScore: 0.91,
        controlLossScore: 0.88,
      },
      {
        text: 'Metal scraped against the ring, and the sharp sound made her flinch.',
        tags: ['metal', 'sound'],
        sensoryScore: 0.86,
        controlLossScore: 0.73,
      },
    ]);

    const candidates = parseHarvestCandidates(output);
    expect(candidates).toHaveLength(3);
    expect(candidates.some((entry) => entry.tags.includes('溫度刺激'))).toBe(true);
    expect(candidates.every((entry) => entry.source === 'uploaded_novel')).toBe(true);
    expect(candidates.every((entry) => entry.tags.every((tag) => /[\u3400-\u9FFF]/.test(tag)))).toBe(true);
  });

  it('parses fenced JSON and strips duplicates', () => {
    const output = [
      '```json',
      '[',
      '{"text":"A","tags":["x"],"sensoryScore":0.6,"controlLossScore":0.6},',
      '{"text":"A","tags":["x"],"sensoryScore":0.7,"controlLossScore":0.7},',
      '{"text":"B","tags":["y"],"sensoryScore":0.8,"controlLossScore":0.8}',
      ']',
      '```',
    ].join('\n');

    const candidates = parseHarvestCandidates(output);
    expect(candidates).toHaveLength(2);
    expect(candidates.map((entry) => entry.text).sort()).toEqual(['A', 'B']);
  });

  it('builds harvest prompt with source text injected', () => {
    const prompt = buildSensoryTemplateHarvestPrompt('SOURCE_TEXT');
    expect(prompt).toContain('SOURCE_TEXT');
    expect(prompt).not.toContain('{{NOVEL_TEXT}}');
  });
});
