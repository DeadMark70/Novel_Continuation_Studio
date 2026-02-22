import { DEFAULT_PROMPTS } from '@/lib/prompts';

export type PromptKey = keyof typeof DEFAULT_PROMPTS;

export const PROMPT_KEYS = Object.keys(DEFAULT_PROMPTS) as PromptKey[];

export const PROMPT_GROUPS: Array<{ title: string; keys: PromptKey[] }> = [
  {
    title: 'Workflow Core',
    keys: [
      'analysisCompressed',
      'analysisRaw',
      'outlineCompressed',
      'outlineRaw',
      'outlinePhase2ACompressed',
      'outlinePhase2ARaw',
      'outlinePhase2BCompressed',
      'outlinePhase2BRaw',
      'breakdown',
      'chapter1Compressed',
      'chapter1Raw',
      'continuationCompressed',
      'continuationRaw',
    ],
  },
  {
    title: 'Compression Pipeline',
    keys: [
      'compression',
      'compressionRoleCards',
      'compressionStyleGuide',
      'compressionPlotLedger',
      'compressionEvidencePack',
      'compressionEroticPack',
    ],
  },
  { title: 'Consistency', keys: ['consistency'] },
];

export const PROMPT_LABELS: Partial<Record<PromptKey, string>> = {
  analysisCompressed: 'Analysis (Compressed)',
  analysisRaw: 'Analysis (Raw)',
  compression: 'Compression Orchestrator',
  compressionRoleCards: 'Compression Role Cards',
  compressionStyleGuide: 'Compression Style Guide',
  compressionPlotLedger: 'Compression Plot Ledger',
  compressionEvidencePack: 'Compression Evidence Pack',
  compressionEroticPack: 'Compression Erotic Pack',
  outlineCompressed: 'Outline (Compressed)',
  outlineRaw: 'Outline (Raw)',
  outlinePhase2ACompressed: 'Outline Phase 2A (Compressed)',
  outlinePhase2ARaw: 'Outline Phase 2A (Raw)',
  outlinePhase2BCompressed: 'Outline Phase 2B (Compressed)',
  outlinePhase2BRaw: 'Outline Phase 2B (Raw)',
  breakdown: 'Chapter Breakdown',
  chapter1Compressed: 'Chapter 1 (Compressed)',
  chapter1Raw: 'Chapter 1 (Raw)',
  continuationCompressed: 'Continuation (Compressed)',
  continuationRaw: 'Continuation (Raw)',
  consistency: 'Consistency Check',
};

export const PROMPT_DESCRIPTIONS: Partial<Record<PromptKey, string>> = {
  analysisCompressed: 'Phase 1 analysis using compressed context.',
  analysisRaw: 'Phase 1 analysis using original novel context.',
  compression: 'Coordinates Phase 0 compression pipeline.',
  compressionRoleCards: 'Extract character cards for compressed memory.',
  compressionStyleGuide: 'Extract style profile for writing consistency.',
  compressionPlotLedger: 'Extract plot ledger summary for continuity.',
  compressionEvidencePack: 'Extract factual evidence pack for grounding.',
  compressionEroticPack: 'Extract adult-theme style, dynamics, and reusable erotic evidence.',
  outlineCompressed: 'Generate outline with compressed context.',
  outlineRaw: 'Generate outline with full raw context.',
  outlinePhase2ACompressed: 'Generate outline subtask 2A with compressed context.',
  outlinePhase2ARaw: 'Generate outline subtask 2A with full raw context.',
  outlinePhase2BCompressed: 'Generate outline subtask 2B with compressed context.',
  outlinePhase2BRaw: 'Generate outline subtask 2B with full raw context.',
  breakdown: 'Convert outline into chapter-level framework.',
  chapter1Compressed: 'Generate chapter 1 with compressed context.',
  chapter1Raw: 'Generate chapter 1 with raw context.',
  continuationCompressed: 'Generate continuation chapter using compressed context.',
  continuationRaw: 'Generate continuation chapter using raw context.',
  consistency: 'Run consistency checks for timeline and character logic.',
};

const REQUIRED_OUTLINE_PHASE2_KEYS: PromptKey[] = [
  'outlinePhase2ACompressed',
  'outlinePhase2ARaw',
  'outlinePhase2BCompressed',
  'outlinePhase2BRaw',
];

function humanizePromptKey(key: PromptKey): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (s) => s.toUpperCase());
}

export function getPromptLabel(key: PromptKey): string {
  return PROMPT_LABELS[key] ?? humanizePromptKey(key);
}

export function getPromptDescription(key: PromptKey): string {
  return PROMPT_DESCRIPTIONS[key] ?? `Prompt template: ${key}`;
}

export function validateSettingsPromptCatalog(): string[] {
  const errors: string[] = [];
  const allKeys = new Set(PROMPT_KEYS);
  const flattened = PROMPT_GROUPS.flatMap((group) => group.keys);
  const groupedSet = new Set<PromptKey>();

  for (const key of flattened) {
    if (!allKeys.has(key)) {
      errors.push(`Prompt group includes unknown key: ${key}`);
      continue;
    }
    if (groupedSet.has(key)) {
      errors.push(`Prompt key appears in multiple groups: ${key}`);
      continue;
    }
    groupedSet.add(key);
  }

  for (const key of REQUIRED_OUTLINE_PHASE2_KEYS) {
    if (!groupedSet.has(key)) {
      errors.push(`Phase 2 prompt key is missing from Settings groups: ${key}`);
    }
  }

  for (const key of groupedSet) {
    if (!PROMPT_LABELS[key]) {
      errors.push(`Prompt label missing for grouped key: ${key}`);
    }
    if (!PROMPT_DESCRIPTIONS[key]) {
      errors.push(`Prompt description missing for grouped key: ${key}`);
    }
  }

  return errors;
}
