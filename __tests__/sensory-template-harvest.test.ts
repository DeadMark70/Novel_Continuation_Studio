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
        povCharacter: '莉亞',
        sensoryScore: 0.95,
        controlLossScore: 0.82,
      },
      {
        text: 'Her knees buckled and her breath broke into short, shaky gasps.',
        tags: ['breath', 'spasm'],
        povCharacter: '莉亞',
        sensoryScore: 0.91,
        controlLossScore: 0.88,
      },
      {
        text: 'Metal scraped against the ring, and the sharp sound made her flinch.',
        tags: ['metal', 'sound'],
        povCharacter: '通用',
        sensoryScore: 0.86,
        controlLossScore: 0.73,
      },
    ]);

    const candidates = parseHarvestCandidates(output);
    expect(candidates).toHaveLength(3);
    expect(candidates.some((entry) => entry.tags.includes('溫度刺激'))).toBe(true);
    expect(candidates.some((entry) => entry.povCharacter === '莉亞')).toBe(true);
    expect(candidates.every((entry) => entry.source === 'uploaded_novel')).toBe(true);
    expect(candidates.every((entry) => entry.tags.every((tag) => /[\u3400-\u9FFF]/.test(tag)))).toBe(true);
  });

  it('parses fenced JSON and strips duplicates', () => {
    const output = [
      '```json',
      '[',
      '{"text":"A","tags":["cold"],"povCharacter":"通用","sensoryScore":0.7,"controlLossScore":0.6},',
      '{"text":"A","tags":["cold"],"povCharacter":"通用","sensoryScore":0.8,"controlLossScore":0.7},',
      '{"text":"B","tags":["friction"],"povCharacter":"通用","sensoryScore":0.8,"controlLossScore":0.8}',
      ']',
      '```',
    ].join('\n');

    const candidates = parseHarvestCandidates(output);
    expect(candidates).toHaveLength(2);
    expect(candidates.map((entry) => entry.text).sort()).toEqual(['A', 'B']);
  });

  it('filters out low-score entries and non-whitelist tags', () => {
    const output = JSON.stringify([
      {
        text: 'valid one',
        tags: ['cold'],
        povCharacter: '主角',
        sensoryScore: 0.9,
        controlLossScore: 0.8,
      },
      {
        text: 'too low score',
        tags: ['friction'],
        povCharacter: '主角',
        sensoryScore: 0.4,
        controlLossScore: 0.7,
      },
      {
        text: 'invalid tag only',
        tags: ['監禁'],
        povCharacter: '主角',
        sensoryScore: 0.92,
        controlLossScore: 0.9,
      },
    ]);

    const candidates = parseHarvestCandidates(output);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].text).toBe('valid one');
  });

  it('accepts object-wrapper payloads and normalizes missing POV', () => {
    const output = JSON.stringify({
      candidates: [
        {
          text: 'first',
          tags: ['cold'],
          sensoryScore: 0.88,
          controlLossScore: 0.8,
        },
        {
          text: 'second',
          tags: ['friction'],
          povCharacter: '',
          sensoryScore: 0.9,
          controlLossScore: 0.8,
        },
      ],
    });

    const candidates = parseHarvestCandidates(output);
    expect(candidates).toHaveLength(2);
    expect(candidates.every((entry) => entry.povCharacter === '通用')).toBe(true);
  });

  it('builds harvest prompt with source text injected', () => {
    const prompt = buildSensoryTemplateHarvestPrompt('SOURCE_TEXT');
    expect(prompt).toContain('SOURCE_TEXT');
    expect(prompt).not.toContain('{{NOVEL_TEXT}}');
  });
});
