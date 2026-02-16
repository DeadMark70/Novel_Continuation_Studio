import {
  applyPromptSectionContract,
  shouldEnforcePromptSections,
  validatePromptSections,
} from '../lib/prompt-section-contracts';

describe('prompt section contracts', () => {
  it('enforces section contract on targeted prompt keys', () => {
    expect(shouldEnforcePromptSections('analysisRaw')).toBe(true);
    expect(shouldEnforcePromptSections('outlineCompressed')).toBe(true);
    expect(shouldEnforcePromptSections('outlinePhase2ACompressed')).toBe(true);
    expect(shouldEnforcePromptSections('outlinePhase2BCompressed')).toBe(true);
    expect(shouldEnforcePromptSections('breakdownMeta')).toBe(true);
    expect(shouldEnforcePromptSections('breakdownChunk')).toBe(true);
  });

  it('does not enforce section contract on chapter generation prompts', () => {
    expect(shouldEnforcePromptSections('chapter1Compressed')).toBe(false);
    expect(shouldEnforcePromptSections('continuationRaw')).toBe(false);
  });

  it('appends contract block for targeted prompt keys', () => {
    const template = 'Base template';
    const result = applyPromptSectionContract(template, 'analysisRaw');
    expect(result).toContain('【輸出章節契約】');
    expect(result).toContain('【權力與張力機制】');
  });

  it('keeps template unchanged for non-target prompt keys', () => {
    const template = 'Base template';
    const result = applyPromptSectionContract(template, 'chapter1Compressed');
    expect(result).toBe(template);
  });

  it('validates missing required sections', () => {
    const content = [
      '【角色動機地圖】',
      'A',
      '【權力與張力機制】',
      'B',
      '【文風錨點（可執行規則）】',
      'C',
    ].join('\n');
    const result = validatePromptSections('analysisRaw', content);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('事件與伏筆 ledger');
    expect(result.missing).toContain('禁止清單（避免重複與失真）');
  });

  it('accepts aliased headings for compression contracts', () => {
    const content = ['【Style Guide】', '- rule 1'].join('\n');
    const result = validatePromptSections('compressionStyleGuide', content);
    expect(result.ok).toBe(true);
  });
});
