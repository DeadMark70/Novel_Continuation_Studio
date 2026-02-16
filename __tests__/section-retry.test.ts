import { generateWithSectionRetry } from '../lib/section-retry';

describe('section retry', () => {
  it('retries once when targeted prompt output misses required sections', async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce([
        '【角色動機地圖】',
        'A',
      ].join('\n'))
      .mockResolvedValueOnce([
        '【角色動機地圖】',
        'A',
        '【權力與張力機制】',
        'B',
        '【文風錨點（可執行規則）】',
        'C',
        '【事件與伏筆 ledger】',
        'D',
        '【續寫升級建議（穩定 + 大膽）】',
        'E',
        '【禁止清單（避免重複與失真）】',
        'F',
      ].join('\n'));

    const result = await generateWithSectionRetry({
      prompt: 'P1',
      promptKey: 'analysisRaw',
      generate,
    });

    expect(result.attempts).toBe(2);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1]?.[2]).toContain('權力與張力機制');
  });

  it('does not retry non-target prompt keys', async () => {
    const generate = vi.fn().mockResolvedValue('chapter content');

    const result = await generateWithSectionRetry({
      prompt: 'P2',
      promptKey: 'chapter1Compressed',
      generate,
    });

    expect(result.attempts).toBe(1);
    expect(result.content).toBe('chapter content');
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('throws when sections are still missing after retry', async () => {
    const generate = vi.fn().mockResolvedValue('【角色動機地圖】\nA');

    await expect(
      generateWithSectionRetry({
        prompt: 'P3',
        promptKey: 'analysisRaw',
        generate,
      })
    ).rejects.toThrow('Missing required sections');

    expect(generate).toHaveBeenCalledTimes(2);
  });
});
