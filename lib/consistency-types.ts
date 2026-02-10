export type ConsistencySeverity = 'low' | 'medium' | 'high';

export type ConsistencyCategory = 'character' | 'timeline' | 'naming' | 'foreshadow';

export type ForeshadowStatus = 'open' | 'resolved' | 'contradicted';

export interface ConsistencyIssue {
  id: string;
  category: ConsistencyCategory;
  severity: ConsistencySeverity;
  title: string;
  evidence: string;
  suggestion: string;
  source: 'rule' | 'llm';
}

export interface CharacterTimelineEntry {
  id: string;
  chapterNumber: number;
  character: string;
  change: string;
  evidence?: string;
  updatedAt: number;
}

export interface ForeshadowEntry {
  id: string;
  title: string;
  status: ForeshadowStatus;
  evidence?: string;
  introducedAtChapter?: number;
  lastUpdatedChapter: number;
}

export interface ConsistencySummary {
  latestChapter: number;
  totalIssues: number;
  highRiskCount: number;
  openForeshadowCount: number;
  lastCheckedAt: number;
}

export interface ConsistencyReport {
  id: string;
  chapterNumber: number;
  generatedAt: number;
  summary: string;
  issues: ConsistencyIssue[];
  regenPromptDraft: string;
}

export interface ConsistencyCheckInput {
  chapterNumber: number;
  latestChapterText: string;
  allChapters: string[];
  characterCards: string;
  styleGuide: string;
  compressionOutline: string;
  evidencePack: string;
  compressedContext: string;
  previousForeshadowLedger?: ForeshadowEntry[];
  llmCheck?: (prompt: string) => Promise<string>;
  promptTemplate?: string;
}

export interface ConsistencyCheckResult {
  report: ConsistencyReport;
  characterTimelineUpdates: CharacterTimelineEntry[];
  foreshadowLedger: ForeshadowEntry[];
  summary: ConsistencySummary;
}
