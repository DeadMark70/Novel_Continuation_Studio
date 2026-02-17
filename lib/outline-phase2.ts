import {
  hasResumeLastOutputDirective,
  stripResumeLastOutputDirective,
} from '@/lib/resume-directive';

export type OutlinePhase2Task = '2A' | '2B';

export interface OutlinePhase2Content {
  part2A: string;
  part2B: string;
  missing2A: string[];
  missing2B: string[];
  structured: boolean;
  rawLegacyContent: string;
}

export interface OutlineTaskDirective {
  target: OutlinePhase2Task | 'both';
  userNotes?: string;
  resumeFromLastOutput: boolean;
}

const DIRECTIVE_PATTERN = /\[\[OUTLINE_TASK:(2A|2B)\]\]/gi;

const MARKERS = {
  part2A: '【Phase 2A】',
  missing2A: '【Phase 2A 缺失章節】',
  part2B: '【Phase 2B】',
  missing2B: '【Phase 2B 缺失章節】',
  status: '【Phase 2 狀態】',
} as const;

function stripDirectiveToken(input: string): string {
  const withoutTaskDirective = input.replace(DIRECTIVE_PATTERN, '').trim();
  return stripResumeLastOutputDirective(withoutTaskDirective) || '';
}

function extractMissingLabels(input: string): string[] {
  const labels = Array.from(input.matchAll(/【([^【】\n]+)】/g)).map((match) => (match[1] || '').trim());
  return labels.filter(Boolean);
}

function extractSection(content: string, marker: string, nextMarkers: string[]): string {
  const startIndex = content.indexOf(marker);
  if (startIndex < 0) {
    return '';
  }
  const sectionStart = startIndex + marker.length;
  const nextIndex = nextMarkers
    .map((nextMarker) => content.indexOf(nextMarker, sectionStart))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const sectionEnd = nextIndex ?? content.length;
  return content.slice(sectionStart, sectionEnd).trim();
}

function renderMissingList(missing: string[]): string {
  if (missing.length === 0) {
    return '- 無';
  }
  return missing.map((label) => `- 【${label}】`).join('\n');
}

export function buildOutlineTaskDirective(
  userNotes: string | undefined,
  task: OutlinePhase2Task
): string {
  const trimmedNotes = userNotes?.trim() || '';
  return trimmedNotes
    ? `${trimmedNotes}\n[[OUTLINE_TASK:${task}]]`
    : `[[OUTLINE_TASK:${task}]]`;
}

export function parseOutlineTaskDirective(userNotes?: string): OutlineTaskDirective {
  if (!userNotes?.trim()) {
    return { target: 'both', resumeFromLastOutput: false };
  }
  const resumeFromLastOutput = hasResumeLastOutputDirective(userNotes);
  const matches = Array.from(userNotes.matchAll(DIRECTIVE_PATTERN));
  const lastDirective = matches[matches.length - 1]?.[1]?.toUpperCase();
  const stripped = stripDirectiveToken(userNotes);
  if (lastDirective === '2A' || lastDirective === '2B') {
    return {
      target: lastDirective,
      userNotes: stripped || undefined,
      resumeFromLastOutput,
    };
  }
  return {
    target: 'both',
    userNotes: stripped || undefined,
    resumeFromLastOutput,
  };
}

export function serializeOutlinePhase2Content(state: Omit<OutlinePhase2Content, 'structured' | 'rawLegacyContent'>): string {
  const statusLine = [
    state.part2A.trim() ? '2A: generated' : '2A: not generated',
    state.part2B.trim() ? '2B: generated' : '2B: not generated',
    state.missing2A.length || state.missing2B.length ? 'integrity: partial' : 'integrity: complete',
  ].join(' | ');

  return [
    MARKERS.part2A,
    state.part2A.trim() || '(尚未生成)',
    '',
    MARKERS.missing2A,
    renderMissingList(state.missing2A),
    '',
    MARKERS.part2B,
    state.part2B.trim() || '(尚未生成)',
    '',
    MARKERS.missing2B,
    renderMissingList(state.missing2B),
    '',
    MARKERS.status,
    `- ${statusLine}`,
  ].join('\n');
}

export function parseOutlinePhase2Content(content: string): OutlinePhase2Content {
  const trimmed = content.trim();
  if (!trimmed) {
    return {
      part2A: '',
      part2B: '',
      missing2A: [],
      missing2B: [],
      structured: true,
      rawLegacyContent: '',
    };
  }
  if (!trimmed.includes(MARKERS.part2A) || !trimmed.includes(MARKERS.part2B)) {
    return {
      part2A: '',
      part2B: '',
      missing2A: [],
      missing2B: [],
      structured: false,
      rawLegacyContent: trimmed,
    };
  }

  const part2A = extractSection(trimmed, MARKERS.part2A, [MARKERS.missing2A]);
  const missing2ARaw = extractSection(trimmed, MARKERS.missing2A, [MARKERS.part2B]);
  const part2B = extractSection(trimmed, MARKERS.part2B, [MARKERS.missing2B]);
  const missing2BRaw = extractSection(trimmed, MARKERS.missing2B, [MARKERS.status]);

  const cleanedPart2A = part2A === '(尚未生成)' ? '' : part2A;
  const cleanedPart2B = part2B === '(尚未生成)' ? '' : part2B;

  return {
    part2A: cleanedPart2A,
    part2B: cleanedPart2B,
    missing2A: extractMissingLabels(missing2ARaw),
    missing2B: extractMissingLabels(missing2BRaw),
    structured: true,
    rawLegacyContent: '',
  };
}
