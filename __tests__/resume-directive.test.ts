import {
  appendResumeLastOutputDirective,
  buildResumePrompt,
  hasResumeLastOutputDirective,
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
    expect(prompt).toContain('【原始任務】');
    expect(prompt).toContain('original task');
    expect(prompt).toContain('【已輸出內容（禁止重複）】');
    expect(prompt).toContain('existing output');
  });
});
