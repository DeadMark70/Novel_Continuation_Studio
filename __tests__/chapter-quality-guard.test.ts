import { describe, expect, it } from 'vitest';
import { evaluateChapterQuality } from '../lib/chapter-quality-guard';

describe('chapter-quality-guard', () => {
  it('penalizes overlong style and repeated ai-like phrases', () => {
    const longSentence = '她彷彿在如同霧氣一樣黏稠的呼吸裡不停延伸同一個動作而且那種感覺就像永遠沒有盡頭一般持續堆疊。';
    const text = `${longSentence}${longSentence}${longSentence}\n\n${longSentence}`;
    const result = evaluateChapterQuality({
      chapterText: text,
      targetStoryWordCount: 20000,
      targetChapterCount: 5,
    });

    expect(result.breakdown.style).toBeLessThan(90);
    expect(result.breakdown.penalties.some((entry) => entry.includes('模板化比喻'))).toBe(true);
  });

  it('penalizes language impurity and garbled markers', () => {
    const result = evaluateChapterQuality({
      chapterText: '她 forcing herself to swallow，然後在門前停下%%%',
      targetStoryWordCount: 18000,
      targetChapterCount: 6,
    });

    expect(result.breakdown.language).toBeLessThan(90);
    expect(result.warnings.some((entry) => entry.includes('語言純度'))).toBe(true);
  });

  it('rewards balanced chapter with complete ending punctuation', () => {
    const repeatedIntro = Array.from({ length: 14 }, () => '她在走廊停住，手背還帶著冷意。').join('');
    const repeatedMiddle = Array.from({ length: 12 }, () => '門內傳來低聲，她深吸一口氣，推門而入。').join('');
    const text = [
      repeatedIntro,
      '',
      repeatedMiddle,
      '',
      '「先聽我說完。」她把話落在句點上。',
    ].join('\n');
    const result = evaluateChapterQuality({
      chapterText: text,
      targetStoryWordCount: 1200,
      targetChapterCount: 3,
    });

    expect(result.breakdown.structure).toBeGreaterThan(60);
    expect(result.score).toBeGreaterThan(60);
  });
});
