import {
  appendResumeLastOutputDirective,
  buildResumePrefix,
  buildResumePrompt,
  hasResumeLastOutputDirective,
  hasUnclosedQuotePairs,
  mergeResumedContent,
  stripResumeLastOutputDirective,
} from '../lib/resume-directive';

describe('resume-directive helpers', () => {
  it('detects and strips resume directive token', () => {
    const source = 'hello\n[[RESUME_LAST_OUTPUT]]';
    expect(hasResumeLastOutputDirective(source)).toBe(true);
    expect(stripResumeLastOutputDirective(source)).toBe('hello');
  });

  it('appends resume directive exactly once', () => {
    const first = appendResumeLastOutputDirective('notes');
    const second = appendResumeLastOutputDirective(first);
    expect(first).toContain('[[RESUME_LAST_OUTPUT]]');
    expect(second.match(/\[\[RESUME_LAST_OUTPUT\]\]/g)?.length).toBe(1);
  });

  it('builds resume prompt with original task and existing output', () => {
    const prompt = buildResumePrompt('original task', 'existing output');
    expect(prompt).toContain('【銜接前綴（僅供接續，不得重複輸出）】');
    expect(prompt).toContain('【原始任務】');
    expect(prompt).toContain('original task');
    expect(prompt).toContain('【已輸出內容（禁止重複）】');
    expect(prompt).toContain('existing output');
  });

  it('builds prefix from the tail of existing output', () => {
    const prefix = buildResumePrefix('1234567890', 4);
    expect(prefix).toBe('7890');
  });

  it('merges resumed chunks by trimming duplicated overlap', () => {
    const merged = mergeResumedContent('她抬起手，指尖發顫。', '指尖發顫。然後又慢慢放下。');
    expect(merged.trimmedOverlapChars).toBeGreaterThan(0);
    expect(merged.merged).toContain('她抬起手，指尖發顫。然後又慢慢放下。');
  });

  it('detects unclosed quote pairs', () => {
    expect(hasUnclosedQuotePairs('她說：「先停下')).toBe(true);
    expect(hasUnclosedQuotePairs('她說：「先停下。」')).toBe(false);
  });
});
