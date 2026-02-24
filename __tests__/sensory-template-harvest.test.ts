import {
  buildSensoryTemplateHarvestPrompt,
  parseHarvestCandidates,
} from '../lib/sensory-template-harvest';

describe('sensory-template-harvest', () => {
  it('parses strict JSON arrays with psychological shift field', () => {
    const output = JSON.stringify([
      {
        text: '冰冷液體沿腿根滑下，她呼吸驟斷，指尖失衡地發顫。',
        psychologicalShift: '羞恥升高且抗拒鬆動',
        tags: ['溫度刺激', '液體釋放'],
        povCharacter: '莉亞',
        sensoryScore: 0.92,
        controlLossScore: 0.84,
      },
      {
        text: '金屬擦過皮膚時，她肩背一縮，喉間只剩破碎喘息。',
        psychologicalShift: '警戒崩落並轉為依附',
        tags: ['摩擦刺激', '聲音反應'],
        povCharacter: '莉亞',
        sensoryScore: 0.9,
        controlLossScore: 0.83,
      },
      {
        text: '束縛壓緊腕骨，她腿根發軟，膝蓋不受控地下沉。',
        psychologicalShift: '控制感流失並出現順從',
        tags: ['壓迫束縛', '失控反應'],
        povCharacter: '通用',
        sensoryScore: 0.88,
        controlLossScore: 0.8,
      },
    ]);

    const candidates = parseHarvestCandidates(output);
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    expect(candidates.every((entry) => entry.psychologicalShift.length >= 4)).toBe(true);
    expect(candidates.every((entry) => entry.source === 'uploaded_novel')).toBe(true);
  });

  it('parses fenced JSON and strips duplicates by text+shift', () => {
    const output = [
      '```json',
      '[',
      '{"text":"冰冷液體沿腿根滑下，她呼吸驟斷，指尖失衡地發顫。","psychologicalShift":"羞恥升高且抗拒鬆動","tags":["溫度刺激"],"povCharacter":"通用","sensoryScore":0.86,"controlLossScore":0.8},',
      '{"text":"冰冷液體沿腿根滑下，她呼吸驟斷，指尖失衡地發顫。","psychologicalShift":"羞恥升高且抗拒鬆動","tags":["溫度刺激"],"povCharacter":"通用","sensoryScore":0.9,"controlLossScore":0.85},',
      '{"text":"束縛壓緊腕骨，她腿根發軟，膝蓋不受控地下沉。","psychologicalShift":"控制感流失並出現順從","tags":["壓迫束縛"],"povCharacter":"通用","sensoryScore":0.84,"controlLossScore":0.8}',
      ']',
      '```',
    ].join('\n');

    const candidates = parseHarvestCandidates(output);
    expect(candidates).toHaveLength(2);
  });

  it('filters out low-score, abstract, and missing-shift entries', () => {
    const output = JSON.stringify([
      {
        text: '指節摩擦皮膚，她呼吸驟亂，肩線緊繃後微微發顫。',
        psychologicalShift: '抗拒鬆動轉為期待',
        tags: ['摩擦刺激'],
        povCharacter: '主角',
        sensoryScore: 0.86,
        controlLossScore: 0.81,
      },
      {
        text: '她的靈魂像星辰墜落在永恆深淵中。',
        psychologicalShift: '抽象情緒堆疊',
        tags: ['溫度刺激'],
        povCharacter: '主角',
        sensoryScore: 0.95,
        controlLossScore: 0.9,
      },
      {
        text: '金屬碰撞時她後頸發麻。',
        psychologicalShift: '',
        tags: ['聲音反應'],
        povCharacter: '主角',
        sensoryScore: 0.9,
        controlLossScore: 0.8,
      },
      {
        text: '有效句，但分數不足。',
        psychologicalShift: '羞恥升高',
        tags: ['觸感質地'],
        povCharacter: '主角',
        sensoryScore: 0.6,
        controlLossScore: 0.6,
      },
    ]);

    const candidates = parseHarvestCandidates(output);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].text).toContain('指節摩擦皮膚');
  });

  it('accepts object-wrapper payloads and normalizes missing POV', () => {
    const output = JSON.stringify({
      candidates: [
        {
          text: '冰冷液體沿腿根滑下，她呼吸驟斷，指尖失衡地發顫。',
          psychologicalShift: '羞恥升高且抗拒鬆動',
          tags: ['溫度刺激'],
          sensoryScore: 0.88,
          controlLossScore: 0.8,
        },
        {
          text: '束縛壓緊腕骨，她腿根發軟，膝蓋不受控地下沉。',
          psychologicalShift: '控制感流失並出現順從',
          tags: ['壓迫束縛'],
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
    expect(prompt).toContain('psychologicalShift');
    expect(prompt).not.toContain('{{NOVEL_TEXT}}');
  });
});
