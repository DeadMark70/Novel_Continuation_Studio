import Dexie, { type Table } from 'dexie';
import type {
  CharacterTimelineEntry,
  ConsistencyReport,
  ConsistencySummary,
  ForeshadowEntry,
} from './consistency-types';
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
  createdAt: number;
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
  novels!: Table<NovelEntry>;
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
        };

        const openrouterProvider: ProviderScopedSettings = entry.providers?.openrouter ?? {
          apiKey: '',
          selectedModel: 'openai/gpt-4o-mini',
          recentModels: [],
          modelCapabilities: {},
          modelParameterSupport: {},
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
  }
}

export const db = new NovelDatabase();

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
    compressedContext: entry.compressedContext ?? '',
    compressionMeta: entry.compressionMeta,
    consistencyReports: entry.consistencyReports ?? [],
    characterTimeline: entry.characterTimeline ?? [],
    foreshadowLedger: entry.foreshadowLedger ?? [],
    latestConsistencySummary: entry.latestConsistencySummary,
  };
  
  // Check if this session already exists
  const existing = await db.novels.where('sessionId').equals(entry.sessionId).first();
  
  if (existing && existing.id) {
    // Update existing session
    return await db.novels.update(existing.id, { 
      ...normalizedEntry,
      updatedAt: now,
      createdAt: existing.createdAt // Keep original creation time
    });
  } else {
    // Create new session
    return await db.novels.add({ 
      ...normalizedEntry, 
      createdAt: now,
      updatedAt: now 
    });
  }
}

/**
 * Get the most recently updated novel entry
 */
export async function getLatestNovel(): Promise<NovelEntry | undefined> {
  return await db.novels.orderBy('updatedAt').last();
}

/**
 * Get all unique sessions (one entry per session, most recent state)
 * Filters out legacy records without sessionId
 */
export async function getAllSessions(): Promise<NovelEntry[]> {
  const all = await db.novels.orderBy('updatedAt').reverse().toArray();
  // Filter out legacy entries without sessionId
  return all.filter(entry => entry.sessionId && typeof entry.sessionId === 'string');
}

/**
 * Get a specific session by sessionId
 */
export async function getSession(sessionId: string): Promise<NovelEntry | undefined> {
  if (!sessionId || typeof sessionId !== 'string') {
    console.warn('[DB] Invalid sessionId provided:', sessionId);
    return undefined;
  }
  return await db.novels.where('sessionId').equals(sessionId).first();
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await db.novels.where('sessionId').equals(sessionId).delete();
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
