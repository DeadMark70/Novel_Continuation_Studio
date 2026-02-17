import Dexie, { type Table } from 'dexie';
import type {
  CharacterTimelineEntry,
  ConsistencyReport,
  ConsistencySummary,
  ForeshadowEntry,
} from './consistency-types';
import type { RunStatus, RunStepId } from './run-types';
import type {
  GenerationParams,
  LLMProvider,
  ModelCapability,
  PhaseConfigMap,
  ProviderScopedSettings,
} from './llm-types';

type WorkflowPhaseId =
  | 'compression'
  | 'analysis'
  | 'outline'
  | 'breakdown'
  | 'chapter1'
  | 'continuation';

const DEFAULT_PHASE_IDS: WorkflowPhaseId[] = [
  'compression',
  'analysis',
  'outline',
  'breakdown',
  'chapter1',
  'continuation',
];

const DEFAULT_MODEL_PARAMS: GenerationParams = {
  maxTokens: 4096,
  autoMaxTokens: false,
  temperature: 0.7,
  topP: 1,
  thinkingEnabled: false,
};

export interface NovelEntry {
  id?: number;
  sessionId: string; // Unique session identifier
  sessionName?: string; // User-friendly name (auto-generated or custom)
  content: string;
  wordCount: number;
  currentStep: number;
  analysis: string;
  outline: string;
  outlineDirection: string;
  breakdown: string;
  chapters: string[];
  targetStoryWordCount?: number;
  targetChapterCount?: number;
  pacingMode?: 'fixed' | 'curve';
  plotPercent?: number;
  curvePlotPercentStart?: number;
  curvePlotPercentEnd?: number;
  eroticSceneLimitPerChapter?: number;
  characterCards?: string;
  styleGuide?: string;
  compressionOutline?: string;
  evidencePack?: string;
  eroticPack?: string;
  compressedContext?: string;
  compressionMeta?: {
    sourceChars: number;
    compressedChars: number;
    ratio: number;
    chunkCount: number;
    generatedAt: number;
    skipped?: boolean;
    reason?: string;
  };
  consistencyReports?: ConsistencyReport[];
  characterTimeline?: CharacterTimelineEntry[];
  foreshadowLedger?: ForeshadowEntry[];
  latestConsistencySummary?: ConsistencySummary;
  runStatus?: RunStatus;
  recoverableStepId?: RunStepId;
  lastRunAt?: number;
  lastRunError?: string;
  lastRunId?: string;
  createdAt: number;
  updatedAt: number;
}

type NovelBlobFields = Pick<
  NovelEntry,
  | 'content'
  | 'analysis'
  | 'outline'
  | 'breakdown'
  | 'chapters'
  | 'characterCards'
  | 'styleGuide'
  | 'compressionOutline'
  | 'evidencePack'
  | 'eroticPack'
  | 'compressedContext'
  | 'consistencyReports'
  | 'characterTimeline'
  | 'foreshadowLedger'
>;

type NovelMetaRecord = Omit<NovelEntry, keyof NovelBlobFields> & Partial<NovelBlobFields>;

interface NovelBlobEntry extends NovelBlobFields {
  sessionId: string;
  updatedAt: number;
}

export interface SettingsEntry {
  id?: string; // 'global'
  apiKey?: string;
  selectedModel?: string;
  recentModels?: string[];
  customPrompts: Record<string, string>;
  truncationThreshold?: number;
  dualEndBuffer?: number;
  compressionMode?: 'auto' | 'on' | 'off';
  compressionAutoThreshold?: number;
  compressionChunkSize?: number;
  compressionChunkOverlap?: number;
  compressionEvidenceSegments?: number;
  autoResumeOnLength?: boolean;
  autoResumePhaseAnalysis?: boolean;
  autoResumePhaseOutline?: boolean;
  autoResumeMaxRounds?: number;
  thinkingEnabled?: boolean;
  modelCapabilities?: Record<string, ModelCapability>;
  activeProvider?: LLMProvider;
  providers?: Record<LLMProvider, ProviderScopedSettings>;
  providerDefaults?: Record<LLMProvider, GenerationParams>;
  modelOverrides?: Record<LLMProvider, Record<string, Partial<GenerationParams>>>;
  phaseConfig?: Partial<PhaseConfigMap>;
  updatedAt: number;
}

export class NovelDatabase extends Dexie {
  novels!: Table<NovelMetaRecord>;
  novelBlobs!: Table<NovelBlobEntry>;
  settings!: Table<SettingsEntry>;

  constructor() {
    super('NovelContinuationDB');
    this.version(1).stores({
      novels: '++id, updatedAt'
    });
    this.version(2).stores({
      settings: 'id, updatedAt'
    });
    // Version 3: Add sessionId for session-based history
    this.version(3).stores({
      novels: '++id, sessionId, updatedAt, createdAt',
      settings: 'id, updatedAt'
    });
    this.version(4).stores({
      novels: '++id, sessionId, updatedAt, createdAt',
      settings: 'id, updatedAt'
    }).upgrade(async (tx) => {
      await tx.table('novels').toCollection().modify((entry: NovelEntry) => {
        if (entry.targetStoryWordCount === undefined) {
          entry.targetStoryWordCount = 20000;
        }
        if (entry.targetChapterCount === undefined) {
          entry.targetChapterCount = 5;
        }
      });

      await tx.table('settings').toCollection().modify((entry: SettingsEntry) => {
        if (entry.thinkingEnabled === undefined) {
          entry.thinkingEnabled = false;
        }
        if (!entry.modelCapabilities) {
          entry.modelCapabilities = {};
        }
      });
    });
    this.version(5).stores({
      novels: '++id, sessionId, updatedAt, createdAt',
      settings: 'id, updatedAt'
    }).upgrade(async (tx) => {
      await tx.table('novels').toCollection().modify((entry: NovelEntry) => {
        if (entry.characterCards === undefined) {
          entry.characterCards = '';
        }
        if (entry.styleGuide === undefined) {
          entry.styleGuide = '';
        }
        if (entry.compressionOutline === undefined) {
          entry.compressionOutline = '';
        }
        if (entry.evidencePack === undefined) {
          entry.evidencePack = '';
        }
        if (entry.compressedContext === undefined) {
          entry.compressedContext = '';
        }
      });

      await tx.table('settings').toCollection().modify((entry: SettingsEntry) => {
        if (!entry.compressionMode) {
          entry.compressionMode = 'auto';
        }
        if (entry.compressionAutoThreshold === undefined) {
          entry.compressionAutoThreshold = 20000;
        }
        if (entry.compressionChunkSize === undefined) {
          entry.compressionChunkSize = 6000;
        }
        if (entry.compressionChunkOverlap === undefined) {
          entry.compressionChunkOverlap = 400;
        }
        if (entry.compressionEvidenceSegments === undefined) {
          entry.compressionEvidenceSegments = 10;
        }
      });
    });
    this.version(6).stores({
      novels: '++id, sessionId, updatedAt, createdAt',
      settings: 'id, updatedAt'
    }).upgrade(async (tx) => {
      await tx.table('novels').toCollection().modify((entry: NovelEntry) => {
        if (!Array.isArray(entry.consistencyReports)) {
          entry.consistencyReports = [];
        }
        if (!Array.isArray(entry.characterTimeline)) {
          entry.characterTimeline = [];
        }
        if (!Array.isArray(entry.foreshadowLedger)) {
          entry.foreshadowLedger = [];
        }
      });
    });
    this.version(7).stores({
      novels: '++id, sessionId, updatedAt, createdAt',
      settings: 'id, updatedAt'
    }).upgrade(async (tx) => {
      await tx.table('settings').toCollection().modify((entry: SettingsEntry) => {
        const legacySelectedModel = entry.selectedModel || 'meta/llama3-70b-instruct';
        const legacyRecentModels = entry.recentModels || [];
        const legacyCapabilities = entry.modelCapabilities || {};
        const legacyThinkingEnabled = entry.thinkingEnabled ?? false;

        const nimProvider: ProviderScopedSettings = entry.providers?.nim ?? {
          apiKey: entry.apiKey || '',
          selectedModel: legacySelectedModel,
          recentModels: legacyRecentModels,
          modelCapabilities: legacyCapabilities,
          modelParameterSupport: {},
          modelTokenLimits: {},
        };

        const openrouterProvider: ProviderScopedSettings = entry.providers?.openrouter ?? {
          apiKey: '',
          selectedModel: 'openai/gpt-4o-mini',
          recentModels: [],
          modelCapabilities: {},
          modelParameterSupport: {},
          modelTokenLimits: {},
        };

        if (!entry.providers) {
          entry.providers = {
            nim: nimProvider,
            openrouter: openrouterProvider,
          };
        } else {
          entry.providers.nim = nimProvider;
          entry.providers.openrouter = openrouterProvider;
        }

        entry.activeProvider = entry.activeProvider ?? 'nim';
        entry.providerDefaults = entry.providerDefaults ?? {
          nim: { ...DEFAULT_MODEL_PARAMS, thinkingEnabled: legacyThinkingEnabled },
          openrouter: { ...DEFAULT_MODEL_PARAMS, thinkingEnabled: false },
        };
        entry.modelOverrides = entry.modelOverrides ?? { nim: {}, openrouter: {} };

        if (!entry.phaseConfig) {
          const phaseConfig = {} as Partial<PhaseConfigMap>;
          for (const phaseId of DEFAULT_PHASE_IDS) {
            phaseConfig[phaseId] = {
              provider: 'nim',
              model: legacySelectedModel,
            };
          }
          entry.phaseConfig = phaseConfig;
        }

        // Keep legacy fields synchronized for backwards compatibility.
        entry.apiKey = entry.providers.nim.apiKey;
        entry.selectedModel = entry.providers.nim.selectedModel;
        entry.recentModels = entry.providers.nim.recentModels;
        entry.modelCapabilities = entry.providers.nim.modelCapabilities;
        entry.thinkingEnabled = entry.providerDefaults.nim.thinkingEnabled;
      });
    });
    this.version(8).stores({
      novels: '++id, sessionId, updatedAt, createdAt',
      settings: 'id, updatedAt'
    }).upgrade(async (tx) => {
      await tx.table('novels').toCollection().modify((entry: NovelEntry) => {
        if (!entry.pacingMode) {
          entry.pacingMode = 'fixed';
        }
        if (entry.plotPercent === undefined) {
          entry.plotPercent = 60;
        }
        if (entry.curvePlotPercentStart === undefined) {
          entry.curvePlotPercentStart = 80;
        }
        if (entry.curvePlotPercentEnd === undefined) {
          entry.curvePlotPercentEnd = 40;
        }
        if (entry.eroticSceneLimitPerChapter === undefined) {
          entry.eroticSceneLimitPerChapter = 2;
        }
      });
    });
    this.version(9).stores({
      novels: '++id, sessionId, updatedAt, createdAt',
      settings: 'id, updatedAt',
      novelBlobs: 'sessionId, updatedAt'
    }).upgrade(async (tx) => {
      const novelsTable = tx.table('novels');
      const blobsTable = tx.table('novelBlobs');
      const entries = await novelsTable.toArray() as NovelMetaRecord[];

      for (const entry of entries) {
        if (!entry.sessionId) {
          continue;
        }

        const existingBlob = await blobsTable.get(entry.sessionId) as NovelBlobEntry | undefined;
        if (!existingBlob) {
          await blobsTable.put({
            sessionId: entry.sessionId,
            updatedAt: entry.updatedAt ?? Date.now(),
            content: entry.content ?? '',
            analysis: entry.analysis ?? '',
            outline: entry.outline ?? '',
            breakdown: entry.breakdown ?? '',
            chapters: Array.isArray(entry.chapters) ? entry.chapters : [],
            characterCards: entry.characterCards ?? '',
            styleGuide: entry.styleGuide ?? '',
            compressionOutline: entry.compressionOutline ?? '',
            evidencePack: entry.evidencePack ?? '',
            eroticPack: entry.eroticPack ?? '',
            compressedContext: entry.compressedContext ?? '',
            consistencyReports: entry.consistencyReports ?? [],
            characterTimeline: entry.characterTimeline ?? [],
            foreshadowLedger: entry.foreshadowLedger ?? [],
          });
        }

        if (entry.id) {
          await novelsTable.update(entry.id, {
            content: '',
            analysis: '',
            outline: '',
            breakdown: '',
            chapters: [],
            characterCards: '',
            styleGuide: '',
            compressionOutline: '',
            evidencePack: '',
            eroticPack: '',
            compressedContext: '',
            consistencyReports: [],
            characterTimeline: [],
            foreshadowLedger: [],
          });
        }
      }
    });
    this.version(10).stores({
      novels: '++id, sessionId, updatedAt, createdAt',
      settings: 'id, updatedAt',
      novelBlobs: 'sessionId, updatedAt'
    }).upgrade(async (tx) => {
      await tx.table('novels').toCollection().modify((entry: NovelMetaRecord) => {
        if (entry.eroticPack === undefined) {
          entry.eroticPack = '';
        }
      });
      await tx.table('novelBlobs').toCollection().modify((entry: NovelBlobEntry) => {
        if (entry.eroticPack === undefined) {
          entry.eroticPack = '';
        }
      });
    });
    this.version(11).stores({
      novels: '++id, sessionId, updatedAt, createdAt',
      settings: 'id, updatedAt',
      novelBlobs: 'sessionId, updatedAt'
    }).upgrade(async (tx) => {
      await tx.table('settings').toCollection().modify((entry: SettingsEntry) => {
        if (entry.autoResumeOnLength === undefined) {
          entry.autoResumeOnLength = true;
        }
        if (entry.autoResumePhaseAnalysis === undefined) {
          entry.autoResumePhaseAnalysis = true;
        }
        if (entry.autoResumePhaseOutline === undefined) {
          entry.autoResumePhaseOutline = true;
        }
        if (entry.autoResumeMaxRounds === undefined) {
          entry.autoResumeMaxRounds = 2;
        }
      });
    });
  }
}

export const db = new NovelDatabase();

function createEmptyBlobFields(): NovelBlobFields {
  return {
    content: '',
    analysis: '',
    outline: '',
    breakdown: '',
    chapters: [],
    characterCards: '',
    styleGuide: '',
    compressionOutline: '',
    evidencePack: '',
    eroticPack: '',
    compressedContext: '',
    consistencyReports: [],
    characterTimeline: [],
    foreshadowLedger: [],
  };
}

function extractBlobFields(entry: Omit<NovelEntry, 'id' | 'updatedAt' | 'createdAt'>): NovelBlobFields {
  return {
    content: entry.content,
    analysis: entry.analysis,
    outline: entry.outline,
    breakdown: entry.breakdown,
    chapters: entry.chapters,
    characterCards: entry.characterCards ?? '',
    styleGuide: entry.styleGuide ?? '',
    compressionOutline: entry.compressionOutline ?? '',
    evidencePack: entry.evidencePack ?? '',
    eroticPack: entry.eroticPack ?? '',
    compressedContext: entry.compressedContext ?? '',
    consistencyReports: entry.consistencyReports ?? [],
    characterTimeline: entry.characterTimeline ?? [],
    foreshadowLedger: entry.foreshadowLedger ?? [],
  };
}

function mergeNovelRecord(meta: NovelMetaRecord, blob?: NovelBlobEntry): NovelEntry {
  const source = blob ?? {
    ...createEmptyBlobFields(),
    content: meta.content ?? '',
    analysis: meta.analysis ?? '',
    outline: meta.outline ?? '',
    breakdown: meta.breakdown ?? '',
    chapters: meta.chapters ?? [],
    characterCards: meta.characterCards ?? '',
    styleGuide: meta.styleGuide ?? '',
    compressionOutline: meta.compressionOutline ?? '',
    evidencePack: meta.evidencePack ?? '',
    eroticPack: meta.eroticPack ?? '',
    compressedContext: meta.compressedContext ?? '',
    consistencyReports: meta.consistencyReports ?? [],
    characterTimeline: meta.characterTimeline ?? [],
    foreshadowLedger: meta.foreshadowLedger ?? [],
    sessionId: meta.sessionId,
    updatedAt: meta.updatedAt,
  };

  return {
    ...meta,
    content: source.content ?? '',
    analysis: source.analysis ?? '',
    outline: source.outline ?? '',
    breakdown: source.breakdown ?? '',
    chapters: source.chapters ?? [],
    characterCards: source.characterCards ?? '',
    styleGuide: source.styleGuide ?? '',
    compressionOutline: source.compressionOutline ?? '',
    evidencePack: source.evidencePack ?? '',
    eroticPack: source.eroticPack ?? '',
    compressedContext: source.compressedContext ?? '',
    consistencyReports: source.consistencyReports ?? [],
    characterTimeline: source.characterTimeline ?? [],
    foreshadowLedger: source.foreshadowLedger ?? [],
    latestConsistencySummary: meta.latestConsistencySummary,
    runStatus: meta.runStatus,
    recoverableStepId: meta.recoverableStepId,
    lastRunAt: meta.lastRunAt,
    lastRunError: meta.lastRunError,
    lastRunId: meta.lastRunId,
  } as NovelEntry;
}

/**
 * Save or update a novel entry within a session.
 * If sessionId exists, update that session. Otherwise create new.
 */
export async function saveNovel(entry: Omit<NovelEntry, 'id' | 'updatedAt' | 'createdAt'>) {
  const now = Date.now();
  const normalizedEntry: Omit<NovelEntry, 'id' | 'updatedAt' | 'createdAt'> = {
    ...entry,
    targetStoryWordCount: entry.targetStoryWordCount ?? 20000,
    targetChapterCount: entry.targetChapterCount ?? 5,
    pacingMode: entry.pacingMode ?? 'fixed',
    plotPercent: entry.plotPercent ?? 60,
    curvePlotPercentStart: entry.curvePlotPercentStart ?? 80,
    curvePlotPercentEnd: entry.curvePlotPercentEnd ?? 40,
    eroticSceneLimitPerChapter: entry.eroticSceneLimitPerChapter ?? 2,
    characterCards: entry.characterCards ?? '',
    styleGuide: entry.styleGuide ?? '',
    compressionOutline: entry.compressionOutline ?? '',
    evidencePack: entry.evidencePack ?? '',
    eroticPack: entry.eroticPack ?? '',
    compressedContext: entry.compressedContext ?? '',
    compressionMeta: entry.compressionMeta,
    consistencyReports: entry.consistencyReports ?? [],
    characterTimeline: entry.characterTimeline ?? [],
    foreshadowLedger: entry.foreshadowLedger ?? [],
    latestConsistencySummary: entry.latestConsistencySummary,
    runStatus: entry.runStatus ?? 'idle',
    recoverableStepId: entry.recoverableStepId,
    lastRunAt: entry.lastRunAt,
    lastRunError: entry.lastRunError,
    lastRunId: entry.lastRunId,
  };

  const blobFields = extractBlobFields(normalizedEntry);
  const metaBlobFields = createEmptyBlobFields();
  let mutationResult = 0;

  await db.transaction('rw', db.novels, db.novelBlobs, async () => {
    const existing = await db.novels.where('sessionId').equals(entry.sessionId).first();

    const metaPayload: Omit<NovelMetaRecord, 'id' | 'updatedAt' | 'createdAt'> = {
      ...normalizedEntry,
      ...metaBlobFields,
    };

    if (existing && existing.id) {
      mutationResult = await db.novels.update(existing.id, {
        ...metaPayload,
        updatedAt: now,
        createdAt: existing.createdAt,
      });
    } else {
      const id = await db.novels.add({
        ...metaPayload,
        createdAt: now,
        updatedAt: now,
      });
      mutationResult = Number(id);
    }

    await db.novelBlobs.put({
      sessionId: entry.sessionId,
      updatedAt: now,
      ...blobFields,
    });
  });

  return mutationResult;
}

/**
 * Get the most recently updated novel entry
 */
export async function getLatestNovel(): Promise<NovelEntry | undefined> {
  const latest = await db.novels.orderBy('updatedAt').last();
  if (!latest?.sessionId) {
    return undefined;
  }
  const blob = await db.novelBlobs.get(latest.sessionId);
  return mergeNovelRecord(latest, blob);
}

/**
 * Get all unique sessions (one entry per session, most recent state)
 * Filters out legacy records without sessionId
 */
export async function getAllSessions(): Promise<NovelEntry[]> {
  const all = await db.novels.orderBy('updatedAt').reverse().toArray();
  // Filter out legacy entries without sessionId
  const filtered = all.filter(entry => entry.sessionId && typeof entry.sessionId === 'string');
  const blobs = await db.novelBlobs.bulkGet(filtered.map((entry) => entry.sessionId));
  const blobMap = new Map<string, NovelBlobEntry>();
  for (const blob of blobs) {
    if (blob?.sessionId) {
      blobMap.set(blob.sessionId, blob);
    }
  }
  return filtered.map((entry) => mergeNovelRecord(entry, blobMap.get(entry.sessionId)));
}

/**
 * Get a specific session by sessionId
 */
export async function getSession(sessionId: string): Promise<NovelEntry | undefined> {
  if (!sessionId || typeof sessionId !== 'string') {
    console.warn('[DB] Invalid sessionId provided:', sessionId);
    return undefined;
  }
  const meta = await db.novels.where('sessionId').equals(sessionId).first();
  if (!meta) {
    return undefined;
  }
  const blob = await db.novelBlobs.get(sessionId);
  return mergeNovelRecord(meta, blob);
}

export async function patchSessionRunMeta(
  sessionId: string,
  patch: {
    runStatus?: RunStatus;
    recoverableStepId?: RunStepId;
    lastRunAt?: number;
    lastRunError?: string;
    lastRunId?: string;
  }
): Promise<void> {
  if (!sessionId) {
    return;
  }

  await db.novels.where('sessionId').equals(sessionId).modify({
    runStatus: patch.runStatus,
    recoverableStepId: patch.recoverableStepId,
    lastRunAt: patch.lastRunAt,
    lastRunError: patch.lastRunError,
    lastRunId: patch.lastRunId,
  } as Partial<NovelMetaRecord>);
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await db.transaction('rw', db.novels, db.novelBlobs, async () => {
    await db.novels.where('sessionId').equals(sessionId).delete();
    await db.novelBlobs.where('sessionId').equals(sessionId).delete();
  });
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Legacy function for backwards compatibility (returns same as getAllSessions)
export async function getNovelHistory(): Promise<NovelEntry[]> {
  return getAllSessions();
}

export async function saveSettings(settings: Omit<SettingsEntry, 'id' | 'updatedAt'>) {
  const updatedAt = Date.now();
  return await db.settings.put({ ...settings, id: 'global', updatedAt });
}

export async function getSettings(): Promise<SettingsEntry | undefined> {
  return await db.settings.get('global');
}
