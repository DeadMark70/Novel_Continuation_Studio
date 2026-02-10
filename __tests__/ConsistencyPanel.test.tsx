import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConsistencyPanel } from '../components/workflow/ConsistencyPanel';
import { useNovelStore } from '../store/useNovelStore';

describe('ConsistencyPanel', () => {
  beforeEach(() => {
    useNovelStore.setState({
      consistencyReports: [],
      characterTimeline: [],
      foreshadowLedger: [],
      latestConsistencySummary: undefined,
    });
  });

  it('shows empty state before any report', () => {
    render(<ConsistencyPanel />);
    expect(screen.getByTestId('consistency-panel')).toBeDefined();
    expect(screen.getByText('尚無一致性報告。生成第 1 章或續寫章節後，系統會自動檢查。')).toBeDefined();
  });

  it('renders latest report, timeline and open foreshadow', () => {
    useNovelStore.setState({
      consistencyReports: [
        {
          id: 'r1',
          chapterNumber: 3,
          generatedAt: Date.now(),
          summary: 'summary',
          issues: [
            {
              id: 'i1',
              category: 'timeline',
              severity: 'high',
              title: '時間線衝突',
              evidence: '第 3 天 -> 第 1 天',
              suggestion: '調整天數',
              source: 'rule',
            },
          ],
          regenPromptDraft: '請重寫第 3 章',
        },
      ],
      characterTimeline: [
        {
          id: 't1',
          chapterNumber: 3,
          character: '小雪',
          change: '對主角的信任提高',
          evidence: '她終於把秘密說出口',
          updatedAt: Date.now(),
        },
      ],
      foreshadowLedger: [
        {
          id: 'f1',
          title: '戒指來源',
          status: 'open',
          evidence: '線索還沒揭曉',
          introducedAtChapter: 2,
          lastUpdatedChapter: 3,
        },
      ],
      latestConsistencySummary: {
        latestChapter: 3,
        totalIssues: 1,
        highRiskCount: 1,
        openForeshadowCount: 1,
        lastCheckedAt: Date.now(),
      },
    });

    render(<ConsistencyPanel />);
    expect(screen.getByText('時間線衝突')).toBeDefined();
    expect(screen.getByText('對主角的信任提高')).toBeDefined();
    expect(screen.getByText('戒指來源')).toBeDefined();
    expect(screen.getByDisplayValue('請重寫第 3 章')).toBeDefined();
  });
});
