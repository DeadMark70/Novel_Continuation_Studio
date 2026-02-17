import {
  buildOutlineTaskDirective,
  parseOutlinePhase2Content,
  parseOutlineTaskDirective,
  serializeOutlinePhase2Content,
} from '../lib/outline-phase2';

describe('outline phase2 helpers', () => {
  it('parses outline task directive and strips token from user notes', () => {
    const parsed = parseOutlineTaskDirective('keep tone dark\n[[OUTLINE_TASK:2A]]');
    expect(parsed.target).toBe('2A');
    expect(parsed.userNotes).toBe('keep tone dark');
    expect(parsed.resumeFromLastOutput).toBe(false);
  });

  it('parses resume directive and strips token from notes', () => {
    const parsed = parseOutlineTaskDirective('keep structure\n[[OUTLINE_TASK:2B]]\n[[RESUME_LAST_OUTPUT]]');
    expect(parsed.target).toBe('2B');
    expect(parsed.userNotes).toBe('keep structure');
    expect(parsed.resumeFromLastOutput).toBe(true);
  });

  it('builds directive token for retry actions', () => {
    const result = buildOutlineTaskDirective('note', '2B');
    expect(result).toContain('[[OUTLINE_TASK:2B]]');
    expect(result).toContain('note');
  });

  it('serializes and parses structured phase2 content', () => {
    const serialized = serializeOutlinePhase2Content({
      part2A: 'A content',
      part2B: 'B content',
      missing2A: [],
      missing2B: ['伏筆回收與新埋規劃'],
    });
    const parsed = parseOutlinePhase2Content(serialized);
    expect(parsed.structured).toBe(true);
    expect(parsed.part2A).toBe('A content');
    expect(parsed.part2B).toBe('B content');
    expect(parsed.missing2B).toContain('伏筆回收與新埋規劃');
  });

  it('treats legacy outline content as unstructured', () => {
    const parsed = parseOutlinePhase2Content('legacy outline text');
    expect(parsed.structured).toBe(false);
    expect(parsed.rawLegacyContent).toBe('legacy outline text');
  });
});
