import { create } from 'zustand';
import { saveNovel, getLatestNovel, getAllSessions, getSession, deleteSession, generateSessionId, type NovelEntry } from '@/lib/db';
import { useWorkflowStore } from './useWorkflowStore';
import { normalizeNovelText } from '@/lib/utils';
import type { CompressionMeta } from '@/lib/compression';
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
  compressedContext: string;
  compressionMeta?: CompressionMeta;
  consistencyReports: ConsistencyReport[];
  characterTimeline: CharacterTimelineEntry[];
  foreshadowLedger: ForeshadowEntry[];
  latestConsistencySummary?: ConsistencySummary;
  
  // State flags
  isInitialized: boolean;

  // Session list (history)
  sessions: NovelEntry[];
  
  // Actions
  setNovel: (content: string) => Promise<void>;
  setStep: (step: number) => Promise<void>;
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
    | 'compressedContext'
    | 'compressionMeta'
    | 'consistencyReports'
    | 'characterTimeline'
    | 'foreshadowLedger'
    | 'latestConsistencySummary'
  >>) => Promise<void>;
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
  loadSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  startNewSession: () => void;
  deleteSessionById: (sessionId: string) => Promise<void>;
}

export const useNovelStore = create<NovelState>((set, get) => ({
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
  compressedContext: '',
  compressionMeta: undefined,
  consistencyReports: [],
  characterTimeline: [],
  foreshadowLedger: [],
  latestConsistencySummary: undefined,
  isInitialized: false,
  sessions: [],

  setNovel: async (content: string) => {
    const normalized = normalizeNovelText(content);
    const count = normalized.length;
    set({ originalNovel: normalized, wordCount: count });
    await get().persist();
  },

  setStep: async (step: number) => {
    set({ currentStep: step });
    await get().persist();
  },

  updateWorkflow: async (data) => {
    set((state) => ({ ...state, ...data }));
    await get().persist();
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
    const state = get();
    
    // Generate session name from first 20 chars of novel or "Untitled"
    const sessionName = state.originalNovel.trim().substring(0, 30) || '未命名小說';
    
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
      compressedContext: state.compressedContext,
      compressionMeta: state.compressionMeta,
      consistencyReports: state.consistencyReports,
      characterTimeline: state.characterTimeline,
      foreshadowLedger: state.foreshadowLedger,
      latestConsistencySummary: state.latestConsistencySummary,
    });
    await get().loadSessions();
  },

  loadSessions: async () => {
    const sessions = await getAllSessions();
    set({ sessions });
  },

  loadSession: async (sessionId: string) => {
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
        compressedContext: session.compressedContext ?? '',
        compressionMeta: session.compressionMeta,
        consistencyReports: session.consistencyReports ?? [],
        characterTimeline: session.characterTimeline ?? [],
        foreshadowLedger: session.foreshadowLedger ?? [],
        latestConsistencySummary: session.latestConsistencySummary,
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
      compressedContext: '',
      compressionMeta: undefined,
      consistencyReports: [],
      characterTimeline: [],
      foreshadowLedger: [],
      latestConsistencySummary: undefined,
      isInitialized: true,
    });
    useWorkflowStore.getState().resetAllSteps();
  },

  deleteSessionById: async (sessionId: string) => {
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

    const latest = await getLatestNovel();
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
        compressedContext: latest.compressedContext ?? '',
        compressionMeta: latest.compressionMeta,
        consistencyReports: latest.consistencyReports ?? [],
        characterTimeline: latest.characterTimeline ?? [],
        foreshadowLedger: latest.foreshadowLedger ?? [],
        latestConsistencySummary: latest.latestConsistencySummary,
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
}));
