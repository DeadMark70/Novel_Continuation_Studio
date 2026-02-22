import { describe, expect, it } from 'vitest';
import { parseAnalysisOutput } from '../lib/analysis-output';

describe('parseAnalysisOutput', () => {
  it('returns raw content as detail when tags are absent', () => {
    const parsed = parseAnalysisOutput('plain analysis');
    expect(parsed.tagged).toBe(false);
    expect(parsed.detail).toBe('plain analysis');
    expect(parsed.executiveSummary).toBe('');
  });

  it('extracts detail and executive summary with case-insensitive tags across lines', () => {
    const parsed = parseAnalysisOutput([
      '<ANALYSIS_DETAIL>',
      '【角色動機地圖】',
      '- a',
      '</ANALYSIS_DETAIL>',
      '',
      '<executive_summary>',
      '- key 1',
      '- key 2',
      '</executive_summary>',
    ].join('\n'));

    expect(parsed.tagged).toBe(true);
    expect(parsed.detail).toContain('【角色動機地圖】');
    expect(parsed.executiveSummary).toContain('- key 1');
  });
});
