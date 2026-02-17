import { create } from 'zustand';
import {
  saveNovel,
  getLatestNovel,
  getAllSessions,
  getSession,
  deleteSession,
  generateSessionId,
  patchSessionRunMeta,
  type NovelEntry,
} from '@/lib/db';
import { useWorkflowStore } from './useWorkflowStore';
import { normalizeNovelText } from '@/lib/utils';
import type { CompressionMeta } from '@/lib/compression';
import type { WorkflowStepId } from '@/store/useWorkflowStore';
import type { PersistedRunMeta, RunStatus, RunStepId } from '@/lib/run-types';
import type {
  CharacterTimelineEntry,
  ConsistencyCheckResult,
  ConsistencyReport,
  ConsistencySummary,
  ForeshadowEntry,
} from '@/lib/consistency-types';

interface NovelState {
  // Session management
  currentSessionId: string;
  
  // Novel content
  originalNovel: string;
  wordCount: number;
  
  // Workflow state
  currentStep: number;
  analysis: string;
  outline: string;
  outlineDirection: string;
  breakdown: string;
  chapters: string[];
  targetStoryWordCount: number;
  targetChapterCount: number;
  pacingMode: 'fixed' | 'curve';
  plotPercent: number;
  curvePlotPercentStart: number;
  curvePlotPercentEnd: number;
  eroticSceneLimitPerChapter: number;
  characterCards: string;
  styleGuide: string;
  compressionOutline: string;
  evidencePack: string;
  eroticPack: string;
  compressedContext: string;
  compressionMeta?: CompressionMeta;
  consistencyReports: ConsistencyReport[];
  characterTimeline: CharacterTimelineEntry[];
  foreshadowLedger: ForeshadowEntry[];
  latestConsistencySummary?: ConsistencySummary;
  runStatus: RunStatus;
  recoverableStepId?: RunStepId;
  lastRunAt?: number;
  lastRunError?: string;
  lastRunId?: string;
  
  // State flags
  isInitialized: boolean;

  // Session list (history)
  sessions: NovelEntry[];
  
  // Actions
  setNovel: (content: string) => Promise<void>;
  setStep: (step: number) => Promise<void>;
  applyStepResult: (stepId: WorkflowStepId, content: string) => Promise<void>;
  applyStepResultBySession: (sessionId: string, stepId: WorkflowStepId, content: string) => Promise<void>;
  updateWorkflow: (data: Partial<Pick<
    NovelState,
    | 'analysis'
    | 'outline'
    | 'outlineDirection'
    | 'breakdown'
    | 'chapters'
    | 'characterCards'
    | 'styleGuide'
    | 'compressionOutline'
    | 'evidencePack'
    | 'eroticPack'
    | 'compressedContext'
    | 'compressionMeta'
    | 'consistencyReports'
    | 'characterTimeline'
    | 'foreshadowLedger'
    | 'latestConsistencySummary'
  >>) => Promise<void>;
  updateWorkflowBySession: (
    sessionId: string,
    data: Partial<Pick<
      NovelState,
      | 'analysis'
      | 'outline'
      | 'outlineDirection'
      | 'breakdown'
      | 'chapters'
      | 'characterCards'
      | 'styleGuide'
      | 'compressionOutline'
      | 'evidencePack'
      | 'eroticPack'
      | 'compressedContext'
      | 'compressionMeta'
      | 'consistencyReports'
      | 'characterTimeline'
      | 'foreshadowLedger'
      | 'latestConsistencySummary'
    >>
  ) => Promise<void>;
  setSessionRunMeta: (sessionId: string, meta: PersistedRunMeta) => Promise<void>;
  getSessionSnapshot: (sessionId: string) => Promise<NovelEntry | undefined>;
  setOutlineDirection: (value: string) => Promise<void>;
  setTargetStoryWordCount: (value: number) => Promise<void>;
  setTargetChapterCount: (value: number) => Promise<void>;
  setPacingSettings: (data: Partial<Pick<
    NovelState,
    | 'pacingMode'
    | 'plotPercent'
    | 'curvePlotPercentStart'
    | 'curvePlotPercentEnd'
    | 'eroticSceneLimitPerChapter'
  >>) => Promise<void>;
  setConsistencyState: (data: Partial<Pick<
    NovelState,
    | 'consistencyReports'
    | 'characterTimeline'
    | 'foreshadowLedger'
    | 'latestConsistencySummary'
  >>) => Promise<void>;
  appendConsistencyReport: (result: ConsistencyCheckResult) => Promise<void>;
  getLatestConsistencyReport: () => ConsistencyReport | undefined;
  reset: () => Promise<void>;
  initialize: () => Promise<void>;
  persist: () => Promise<void>;
  hasPendingPersist: () => boolean;
  flushPendingPersist: () => Promise<void>;
  loadSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  startNewSession: () => void;
  deleteSessionById: (sessionId: string) => Promise<void>;
}

const NOVEL_PERSIST_DEBOUNCE_MS = 350;

function omitPersistenceMeta<T extends { id?: unknown; updatedAt?: unknown; createdAt?: unknown }>(
  entry: T
): Omit<T, 'id' | 'updatedAt' | 'createdAt'> {
  const payload = { ...entry };
  delete payload.id;
  delete payload.updatedAt;
  delete payload.createdAt;
  return payload;
}

export const useNovelStore = create<NovelState>((set, get) => {
  let pendingPersistTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingPersistPromise: Promise<void> | null = null;
  let resolvePendingPersist: (() => void) | null = null;
  let pendingPersistInFlight: Promise<void> | null = null;

  const hasPendingPersist = () => (
    pendingPersistTimer !== null ||
    pendingPersistPromise !== null ||
    pendingPersistInFlight !== null
  );

  const consumePendingPersistResolver = () => {
    if (pendingPersistTimer) {
      clearTimeout(pendingPersistTimer);
      pendingPersistTimer = null;
    }
    const resolver = resolvePendingPersist;
    resolvePendingPersist = null;
    pendingPersistPromise = null;
    return resolver;
  };

  const scheduleDebouncedPersist = (): Promise<void> => {
    if (!pendingPersistPromise) {
      pendingPersistPromise = new Promise<void>((resolve) => {
        resolvePendingPersist = resolve;
      });
    }
    if (pendingPersistTimer) {
      clearTimeout(pendingPersistTimer);
    }
    pendingPersistTimer = setTimeout(() => {
      pendingPersistTimer = null;
      void get().persist();
    }, NOVEL_PERSIST_DEBOUNCE_MS);
    return pendingPersistPromise;
  };

  const flushPendingPersist = async (): Promise<void> => {
    if (pendingPersistTimer) {
      await get().persist();
      return;
    }
    if (pendingPersistInFlight) {
      await pendingPersistInFlight;
      return;
    }
    if (pendingPersistPromise) {
      await pendingPersistPromise;
    }
  };

  return {
  currentSessionId: generateSessionId(),
  originalNovel: '',
  wordCount: 0,
  currentStep: 1,
  analysis: '',
  outline: '',
  outlineDirection: '',
  breakdown: '',
  chapters: [],
  targetStoryWordCount: 20000,
  targetChapterCount: 5,
  pacingMode: 'fixed',
  plotPercent: 60,
  curvePlotPercentStart: 80,
  curvePlotPercentEnd: 40,
  eroticSceneLimitPerChapter: 2,
  characterCards: '',
  styleGuide: '',
  compressionOutline: '',
  evidencePack: '',
  eroticPack: '',
  compressedContext: '',
  compressionMeta: undefined,
  consistencyReports: [],
  characterTimeline: [],
  foreshadowLedger: [],
  latestConsistencySummary: undefined,
  runStatus: 'idle',
  recoverableStepId: undefined,
  lastRunAt: undefined,
  lastRunError: undefined,
  lastRunId: undefined,
  isInitialized: false,
  sessions: [],

  setNovel: async (content: string) => {
    const normalized = normalizeNovelText(content);
    const count = normalized.length;
    set({ originalNovel: normalized, wordCount: count });
    await scheduleDebouncedPersist();
  },

  setStep: async (step: number) => {
    set({ currentStep: step });
    await get().persist();
  },

  applyStepResult: async (stepId, content) => {
    await get().applyStepResultBySession(get().currentSessionId, stepId, content);
  },

  updateWorkflow: async (data) => {
    await get().updateWorkflowBySession(get().currentSessionId, data);
  },

  applyStepResultBySession: async (sessionId, stepId, content) => {
    if (!sessionId) {
      return;
    }

    const patchResult = (entry: Pick<NovelState, 'analysis' | 'outline' | 'breakdown' | 'chapters' | 'compressedContext'>) => {
      if (stepId === 'compression') {
        return { compressedContext: content };
      }
      if (stepId === 'analysis') {
        return { analysis: content };
      }
      if (stepId === 'outline') {
        return { outline: content };
      }
      if (stepId === 'breakdown') {
        return { breakdown: content };
      }
      if (stepId === 'chapter1') {
        return { chapters: [content] };
      }
      if (!content.trim()) {
        return {};
      }
      return { chapters: [...entry.chapters, content] };
    };

    if (sessionId === get().currentSessionId) {
      set((state) => ({ ...state, ...patchResult(state) }));
      await get().persist();
      return;
    }

    const session = await getSession(sessionId);
    if (!session) {
      return;
    }

    const merged = { ...session, ...patchResult({
      analysis: session.analysis,
      outline: session.outline,
      breakdown: session.breakdown,
      chapters: session.chapters,
      compressedContext: session.compressedContext ?? '',
    }) };
    const payload = omitPersistenceMeta(merged);
    await saveNovel(payload);
    set((state) => ({
      sessions: state.sessions.map((entry) => (
        entry.sessionId === sessionId
          ? { ...entry, ...merged, updatedAt: Date.now() }
          : entry
      )),
    }));
  },

  updateWorkflowBySession: async (sessionId, data) => {
    if (!sessionId) {
      return;
    }
    if (sessionId === get().currentSessionId) {
      set((state) => ({ ...state, ...data }));
      await get().persist();
      return;
    }

    const session = await getSession(sessionId);
    if (!session) {
      return;
    }
    const merged = { ...session, ...data };
    const payload = omitPersistenceMeta(merged);
    await saveNovel(payload);
    set((state) => ({
      sessions: state.sessions.map((entry) => (
        entry.sessionId === sessionId
          ? { ...entry, ...merged, updatedAt: Date.now() }
          : entry
      )),
    }));
  },

  setSessionRunMeta: async (sessionId, meta) => {
    if (!sessionId) {
      return;
    }

    const runPatch = {
      runStatus: meta.runStatus,
      recoverableStepId: meta.recoverableStepId,
      lastRunAt: meta.lastRunAt,
      lastRunError: meta.lastRunError,
      lastRunId: meta.lastRunId,
    };

    const state = get();
    const cachedSession = state.sessions.find((entry) => entry.sessionId === sessionId);
    const currentBase = sessionId === state.currentSessionId
      ? {
          runStatus: state.runStatus,
          recoverableStepId: state.recoverableStepId,
          lastRunAt: state.lastRunAt,
          lastRunError: state.lastRunError,
          lastRunId: state.lastRunId,
        }
      : {
          runStatus: cachedSession?.runStatus ?? 'idle',
          recoverableStepId: cachedSession?.recoverableStepId,
          lastRunAt: cachedSession?.lastRunAt,
          lastRunError: cachedSession?.lastRunError,
          lastRunId: cachedSession?.lastRunId,
        };

    const resolvedRunMeta = {
      runStatus: runPatch.runStatus ?? currentBase.runStatus,
      recoverableStepId: runPatch.recoverableStepId,
      lastRunAt: runPatch.lastRunAt ?? currentBase.lastRunAt,
      lastRunError: runPatch.lastRunError ?? currentBase.lastRunError,
      lastRunId: runPatch.lastRunId ?? currentBase.lastRunId,
    };

    if (sessionId === get().currentSessionId) {
      set((state) => ({
        ...state,
        runStatus: resolvedRunMeta.runStatus,
        recoverableStepId: resolvedRunMeta.recoverableStepId,
        lastRunAt: resolvedRunMeta.lastRunAt,
        lastRunError: resolvedRunMeta.lastRunError,
        lastRunId: resolvedRunMeta.lastRunId,
        sessions: state.sessions.map((entry) => (
          entry.sessionId === sessionId
            ? {
                ...entry,
                runStatus: resolvedRunMeta.runStatus,
                recoverableStepId: resolvedRunMeta.recoverableStepId,
                lastRunAt: resolvedRunMeta.lastRunAt,
                lastRunError: resolvedRunMeta.lastRunError,
                lastRunId: resolvedRunMeta.lastRunId,
              }
            : entry
        )),
      }));
      await patchSessionRunMeta(sessionId, resolvedRunMeta);
      return;
    }

    await patchSessionRunMeta(sessionId, resolvedRunMeta);
    set((state) => ({
      sessions: state.sessions.map((entry) => (
        entry.sessionId === sessionId
          ? {
              ...entry,
              runStatus: resolvedRunMeta.runStatus,
              recoverableStepId: resolvedRunMeta.recoverableStepId,
              lastRunAt: resolvedRunMeta.lastRunAt,
              lastRunError: resolvedRunMeta.lastRunError,
              lastRunId: resolvedRunMeta.lastRunId,
            }
          : entry
      )),
    }));
  },

  getSessionSnapshot: async (sessionId) => {
    if (!sessionId) {
      return undefined;
    }
    if (sessionId === get().currentSessionId) {
      const state = get();
      return {
        sessionId: state.currentSessionId,
        sessionName: state.originalNovel.trim().substring(0, 30) || '未命名小說',
        content: state.originalNovel,
        wordCount: state.wordCount,
        currentStep: state.currentStep,
        analysis: state.analysis,
        outline: state.outline,
        outlineDirection: state.outlineDirection,
        breakdown: state.breakdown,
        chapters: state.chapters,
        targetStoryWordCount: state.targetStoryWordCount,
        targetChapterCount: state.targetChapterCount,
        pacingMode: state.pacingMode,
        plotPercent: state.plotPercent,
        curvePlotPercentStart: state.curvePlotPercentStart,
        curvePlotPercentEnd: state.curvePlotPercentEnd,
        eroticSceneLimitPerChapter: state.eroticSceneLimitPerChapter,
        characterCards: state.characterCards,
        styleGuide: state.styleGuide,
        compressionOutline: state.compressionOutline,
        evidencePack: state.evidencePack,
        eroticPack: state.eroticPack,
        compressedContext: state.compressedContext,
        compressionMeta: state.compressionMeta,
        consistencyReports: state.consistencyReports,
        characterTimeline: state.characterTimeline,
        foreshadowLedger: state.foreshadowLedger,
        latestConsistencySummary: state.latestConsistencySummary,
        runStatus: state.runStatus,
        recoverableStepId: state.recoverableStepId,
        lastRunAt: state.lastRunAt,
        lastRunError: state.lastRunError,
        lastRunId: state.lastRunId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
    return getSession(sessionId);
  },

  setOutlineDirection: async (value: string) => {
    set({ outlineDirection: value });
    await get().persist();
  },

  setTargetStoryWordCount: async (value: number) => {
    const safeValue = Math.max(5000, Math.min(50000, value));
    set({ targetStoryWordCount: safeValue });
    await get().persist();
  },

  setTargetChapterCount: async (value: number) => {
    const safeValue = Math.max(3, Math.min(20, value));
    set({ targetChapterCount: safeValue });
    await get().persist();
  },

  setPacingSettings: async (data) => {
    set((state) => ({
      pacingMode: data.pacingMode ?? state.pacingMode,
      plotPercent: data.plotPercent === undefined
        ? state.plotPercent
        : Math.max(0, Math.min(100, Math.floor(data.plotPercent))),
      curvePlotPercentStart: data.curvePlotPercentStart === undefined
        ? state.curvePlotPercentStart
        : Math.max(0, Math.min(100, Math.floor(data.curvePlotPercentStart))),
      curvePlotPercentEnd: data.curvePlotPercentEnd === undefined
        ? state.curvePlotPercentEnd
        : Math.max(0, Math.min(100, Math.floor(data.curvePlotPercentEnd))),
      eroticSceneLimitPerChapter: data.eroticSceneLimitPerChapter === undefined
        ? state.eroticSceneLimitPerChapter
        : Math.max(0, Math.min(8, Math.floor(data.eroticSceneLimitPerChapter))),
    }));
    await get().persist();
  },

  setConsistencyState: async (data) => {
    set((state) => ({ ...state, ...data }));
    await get().persist();
  },

  appendConsistencyReport: async (result) => {
    set((state) => ({
      consistencyReports: [...state.consistencyReports, result.report].slice(-30),
      characterTimeline: [...state.characterTimeline, ...result.characterTimelineUpdates].slice(-300),
      foreshadowLedger: result.foreshadowLedger.slice(-120),
      latestConsistencySummary: result.summary,
    }));
    await get().persist();
  },

  getLatestConsistencyReport: () => {
    const reports = get().consistencyReports;
    if (reports.length === 0) {
      return undefined;
    }
    return reports[reports.length - 1];
  },

  persist: async () => {
    const resolveDebouncedPersist = consumePendingPersistResolver();
    const state = get();

    const persistPromise = (async () => {
      // Generate session name from first 20 chars of novel or "Untitled"
      const sessionName = state.originalNovel.trim().substring(0, 30) || '未命名小說';

      try {
        await saveNovel({
          sessionId: state.currentSessionId,
          sessionName: sessionName + (sessionName.length >= 30 ? '...' : ''),
          content: state.originalNovel,
          wordCount: state.wordCount,
          currentStep: state.currentStep,
          analysis: state.analysis,
          outline: state.outline,
          outlineDirection: state.outlineDirection,
          breakdown: state.breakdown,
          chapters: state.chapters,
          targetStoryWordCount: state.targetStoryWordCount,
          targetChapterCount: state.targetChapterCount,
          pacingMode: state.pacingMode,
          plotPercent: state.plotPercent,
          curvePlotPercentStart: state.curvePlotPercentStart,
          curvePlotPercentEnd: state.curvePlotPercentEnd,
          eroticSceneLimitPerChapter: state.eroticSceneLimitPerChapter,
          characterCards: state.characterCards,
          styleGuide: state.styleGuide,
          compressionOutline: state.compressionOutline,
          evidencePack: state.evidencePack,
          eroticPack: state.eroticPack,
          compressedContext: state.compressedContext,
          compressionMeta: state.compressionMeta,
          consistencyReports: state.consistencyReports,
          characterTimeline: state.characterTimeline,
          foreshadowLedger: state.foreshadowLedger,
          latestConsistencySummary: state.latestConsistencySummary,
          runStatus: state.runStatus,
          recoverableStepId: state.recoverableStepId,
          lastRunAt: state.lastRunAt,
          lastRunError: state.lastRunError,
          lastRunId: state.lastRunId,
        });
        set((current) => {
          const nextEntry = {
            sessionId: state.currentSessionId,
            sessionName: sessionName + (sessionName.length >= 30 ? '...' : ''),
            content: state.originalNovel,
            wordCount: state.wordCount,
            currentStep: state.currentStep,
            analysis: state.analysis,
            outline: state.outline,
            outlineDirection: state.outlineDirection,
            breakdown: state.breakdown,
            chapters: state.chapters,
            targetStoryWordCount: state.targetStoryWordCount,
            targetChapterCount: state.targetChapterCount,
            pacingMode: state.pacingMode,
            plotPercent: state.plotPercent,
            curvePlotPercentStart: state.curvePlotPercentStart,
            curvePlotPercentEnd: state.curvePlotPercentEnd,
            eroticSceneLimitPerChapter: state.eroticSceneLimitPerChapter,
            characterCards: state.characterCards,
            styleGuide: state.styleGuide,
            compressionOutline: state.compressionOutline,
            evidencePack: state.evidencePack,
            eroticPack: state.eroticPack,
            compressedContext: state.compressedContext,
            compressionMeta: state.compressionMeta,
            consistencyReports: state.consistencyReports,
            characterTimeline: state.characterTimeline,
            foreshadowLedger: state.foreshadowLedger,
            latestConsistencySummary: state.latestConsistencySummary,
            runStatus: state.runStatus,
            recoverableStepId: state.recoverableStepId,
            lastRunAt: state.lastRunAt,
            lastRunError: state.lastRunError,
            lastRunId: state.lastRunId,
            updatedAt: Date.now(),
            createdAt: Date.now(),
          };

          const exists = current.sessions.some((entry) => entry.sessionId === state.currentSessionId);
          if (!exists) {
            return { sessions: [nextEntry, ...current.sessions] };
          }
          return {
            sessions: current.sessions.map((entry) => (
              entry.sessionId === state.currentSessionId
                ? { ...entry, ...nextEntry, createdAt: entry.createdAt ?? nextEntry.createdAt }
                : entry
            )),
          };
        });
      } finally {
        resolveDebouncedPersist?.();
      }
    })();

    pendingPersistInFlight = persistPromise;
    try {
      await persistPromise;
    } finally {
      if (pendingPersistInFlight === persistPromise) {
        pendingPersistInFlight = null;
      }
    }
  },

  hasPendingPersist,
  flushPendingPersist,

  loadSessions: async () => {
    const sessions = await getAllSessions();
    set({ sessions });
  },

  loadSession: async (sessionId: string) => {
    if (hasPendingPersist()) {
      await flushPendingPersist();
    }
    const session = await getSession(sessionId);
    if (session) {
      set({
        currentSessionId: session.sessionId,
        originalNovel: session.content,
        wordCount: session.wordCount,
        currentStep: session.currentStep,
        analysis: session.analysis,
        outline: session.outline,
        outlineDirection: session.outlineDirection,
        breakdown: session.breakdown,
        chapters: session.chapters,
        targetStoryWordCount: session.targetStoryWordCount ?? 20000,
        targetChapterCount: session.targetChapterCount ?? 5,
        pacingMode: session.pacingMode ?? 'fixed',
        plotPercent: session.plotPercent ?? 60,
        curvePlotPercentStart: session.curvePlotPercentStart ?? 80,
        curvePlotPercentEnd: session.curvePlotPercentEnd ?? 40,
        eroticSceneLimitPerChapter: session.eroticSceneLimitPerChapter ?? 2,
        characterCards: session.characterCards ?? '',
        styleGuide: session.styleGuide ?? '',
        compressionOutline: session.compressionOutline ?? '',
        evidencePack: session.evidencePack ?? '',
        eroticPack: session.eroticPack ?? '',
        compressedContext: session.compressedContext ?? '',
        compressionMeta: session.compressionMeta,
        consistencyReports: session.consistencyReports ?? [],
        characterTimeline: session.characterTimeline ?? [],
        foreshadowLedger: session.foreshadowLedger ?? [],
        latestConsistencySummary: session.latestConsistencySummary,
        runStatus: session.runStatus ?? 'idle',
        recoverableStepId: session.recoverableStepId,
        lastRunAt: session.lastRunAt,
        lastRunError: session.lastRunError,
        lastRunId: session.lastRunId,
      });
      useWorkflowStore.getState().hydrateFromNovelSession({
        currentStep: session.currentStep,
        analysis: session.analysis,
        outline: session.outline,
        breakdown: session.breakdown,
        chapters: session.chapters,
        compressedContext: session.compressedContext ?? '',
      });
      set({ isInitialized: true });
    }
  },

  startNewSession: () => {
    if (hasPendingPersist()) {
      void flushPendingPersist();
    }
    const newSessionId = generateSessionId();
    set({
      currentSessionId: newSessionId,
      originalNovel: '',
      wordCount: 0,
      currentStep: 1,
      analysis: '',
      outline: '',
      outlineDirection: '',
      breakdown: '',
      chapters: [],
      targetStoryWordCount: 20000,
      targetChapterCount: 5,
      pacingMode: 'fixed',
      plotPercent: 60,
      curvePlotPercentStart: 80,
      curvePlotPercentEnd: 40,
      eroticSceneLimitPerChapter: 2,
      characterCards: '',
      styleGuide: '',
      compressionOutline: '',
      evidencePack: '',
      eroticPack: '',
      compressedContext: '',
      compressionMeta: undefined,
      consistencyReports: [],
      characterTimeline: [],
      foreshadowLedger: [],
      latestConsistencySummary: undefined,
      runStatus: 'idle',
      recoverableStepId: undefined,
      lastRunAt: undefined,
      lastRunError: undefined,
      lastRunId: undefined,
      isInitialized: true,
    });
    useWorkflowStore.getState().resetAllSteps();
  },

  deleteSessionById: async (sessionId: string) => {
    if (hasPendingPersist()) {
      await flushPendingPersist();
    }
    await deleteSession(sessionId);
    await get().loadSessions();
    
    // If deleted current session, start a new one
    if (get().currentSessionId === sessionId) {
      get().startNewSession();
    }
  },

  reset: async () => {
    get().startNewSession();
    await get().persist();
  },

  initialize: async () => {
    if (get().isInitialized) return;

    const latestBeforeRecovery = await getLatestNovel();
    const allSessions = await getAllSessions();
    for (const session of allSessions) {
      if (session.runStatus === 'queued' || session.runStatus === 'running') {
        await patchSessionRunMeta(session.sessionId, {
          runStatus: 'interrupted' as RunStatus,
          recoverableStepId: session.recoverableStepId,
          lastRunError: 'Interrupted by page reload or app restart.',
          lastRunAt: Date.now(),
          lastRunId: session.lastRunId,
        });
      }
    }

    const latest = latestBeforeRecovery?.sessionId
      ? await getSession(latestBeforeRecovery.sessionId)
      : await getLatestNovel();
    if (latest) {
      set({
        currentSessionId: latest.sessionId,
        originalNovel: latest.content,
        wordCount: latest.wordCount,
        currentStep: latest.currentStep,
        analysis: latest.analysis,
        outline: latest.outline,
        outlineDirection: latest.outlineDirection,
        breakdown: latest.breakdown,
        chapters: latest.chapters,
        targetStoryWordCount: latest.targetStoryWordCount ?? 20000,
        targetChapterCount: latest.targetChapterCount ?? 5,
        pacingMode: latest.pacingMode ?? 'fixed',
        plotPercent: latest.plotPercent ?? 60,
        curvePlotPercentStart: latest.curvePlotPercentStart ?? 80,
        curvePlotPercentEnd: latest.curvePlotPercentEnd ?? 40,
        eroticSceneLimitPerChapter: latest.eroticSceneLimitPerChapter ?? 2,
        characterCards: latest.characterCards ?? '',
        styleGuide: latest.styleGuide ?? '',
        compressionOutline: latest.compressionOutline ?? '',
        evidencePack: latest.evidencePack ?? '',
        eroticPack: latest.eroticPack ?? '',
        compressedContext: latest.compressedContext ?? '',
        compressionMeta: latest.compressionMeta,
        consistencyReports: latest.consistencyReports ?? [],
        characterTimeline: latest.characterTimeline ?? [],
        foreshadowLedger: latest.foreshadowLedger ?? [],
        latestConsistencySummary: latest.latestConsistencySummary,
        runStatus: latest.runStatus ?? 'idle',
        recoverableStepId: latest.recoverableStepId,
        lastRunAt: latest.lastRunAt,
        lastRunError: latest.lastRunError,
        lastRunId: latest.lastRunId,
      });

      // Hydrate workflow store
      useWorkflowStore.getState().hydrateFromNovelSession({
        currentStep: latest.currentStep,
        analysis: latest.analysis,
        outline: latest.outline,
        breakdown: latest.breakdown,
        chapters: latest.chapters,
        compressedContext: latest.compressedContext ?? '',
      });
    }
    await get().loadSessions();
    set({ isInitialized: true });
  },
  };
});
