import { describe, expect, it, vi } from 'vitest';
import { buildRegenPromptDraft, runConsistencyCheck } from '../lib/consistency-checker';

describe('consistency-checker', () => {
  it('detects timeline regression and builds summary', async () => {
    const result = await runConsistencyCheck({
      chapterNumber: 3,
      latestChapterText: '第 1 天夜裡，她忽然想起那個約定。',
      allChapters: [
        '第 1 天，阿明第一次見到小雪。',
        '第 2 天，兩人一起調查戒指。',
        '第 1 天夜裡，她忽然想起那個約定。',
      ],
      characterCards: '- 阿明：主角\n- 小雪：女主',
      styleGuide: '',
      compressionOutline: '',
      evidencePack: '',
      eroticPack: '',
      compressedContext: '',
      previousForeshadowLedger: [],
    });

    expect(result.summary.latestChapter).toBe(3);
    expect(result.summary.highRiskCount).toBeGreaterThan(0);
    expect(result.report.issues.some((issue) => issue.category === 'timeline' && issue.severity === 'high')).toBe(true);
    expect(result.report.regenPromptDraft.length).toBeGreaterThan(10);
  });

  it('merges llm output when valid json is returned', async () => {
    const llmCheck = vi.fn().mockResolvedValue(`\`\`\`json
{
  "summary": "LLM summary",
  "issues": [
    {
      "category": "character",
      "severity": "high",
      "title": "人設衝突",
      "evidence": "角色忽然否認前章動機",
      "suggestion": "補心理轉折"
    }
  ],
  "characterUpdates": [
    {
      "character": "阿明",
      "change": "對小雪產生依賴",
      "evidence": "他主動向小雪求助"
    }
  ],
  "foreshadowUpdates": [
    {
      "title": "戒指來源",
      "status": "open",
      "evidence": "仍未揭曉"
    }
  ]
}
\`\`\``);

    const result = await runConsistencyCheck({
      chapterNumber: 4,
      latestChapterText: '阿明在雨夜裡對小雪說，總有一天要查明戒指來源。',
      allChapters: [
        '第 1 章',
        '第 2 章',
        '第 3 章',
        '阿明在雨夜裡對小雪說，總有一天要查明戒指來源。',
      ],
      characterCards: '- 阿明：主角\n- 小雪：女主',
      styleGuide: '',
      compressionOutline: '',
      evidencePack: '',
      eroticPack: '',
      compressedContext: '',
      previousForeshadowLedger: [],
      llmCheck,
      promptTemplate: 'JSON only {{LATEST_CHAPTER}} {{CHARACTER_CARDS}}',
    });

    expect(llmCheck).toHaveBeenCalledTimes(1);
    expect(result.report.summary).toContain('LLM summary');
    expect(result.report.issues.some((issue) => issue.title === '人設衝突')).toBe(true);
    expect(result.characterTimelineUpdates.some((entry) => entry.character === '阿明')).toBe(true);
    expect(result.foreshadowLedger.some((entry) => entry.title.includes('戒指來源'))).toBe(true);
  });

  it('builds regen prompt from medium/high issues', () => {
    const draft = buildRegenPromptDraft({
      chapterNumber: 6,
      issues: [
        {
          id: 'i1',
          category: 'naming',
          severity: 'low',
          title: '低風險',
          evidence: 'x',
          suggestion: 'x',
          source: 'rule',
        },
        {
          id: 'i2',
          category: 'foreshadow',
          severity: 'medium',
          title: '伏筆未回收',
          evidence: '戒指來源仍未揭曉',
          suggestion: '在本章補一個自然回收句',
          source: 'rule',
        },
      ],
    });

    expect(draft).toContain('第 6 章');
    expect(draft).toContain('伏筆未回收');
    expect(draft).toContain('輸出：只回傳重寫後章節正文');
  });
});
