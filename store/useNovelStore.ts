import { create } from 'zustand';
import { saveNovel, getLatestNovel, getAllSessions, getSession, deleteSession, generateSessionId, type NovelEntry } from '@/lib/db';
import { useWorkflowStore } from './useWorkflowStore';
import { normalizeNovelText } from '@/lib/utils';
import type { CompressionMeta } from '@/lib/compression';

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
  characterCards: string;
  styleGuide: string;
  compressionOutline: string;
  evidencePack: string;
  compressedContext: string;
  compressionMeta?: CompressionMeta;
  
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
  >>) => Promise<void>;
  setOutlineDirection: (value: string) => Promise<void>;
  setTargetStoryWordCount: (value: number) => Promise<void>;
  setTargetChapterCount: (value: number) => Promise<void>;
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
  characterCards: '',
  styleGuide: '',
  compressionOutline: '',
  evidencePack: '',
  compressedContext: '',
  compressionMeta: undefined,
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
      characterCards: state.characterCards,
      styleGuide: state.styleGuide,
      compressionOutline: state.compressionOutline,
      evidencePack: state.evidencePack,
      compressedContext: state.compressedContext,
      compressionMeta: state.compressionMeta,
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
        characterCards: session.characterCards ?? '',
        styleGuide: session.styleGuide ?? '',
        compressionOutline: session.compressionOutline ?? '',
        evidencePack: session.evidencePack ?? '',
        compressedContext: session.compressedContext ?? '',
        compressionMeta: session.compressionMeta,
      });
      useWorkflowStore.getState().hydrateFromNovelSession({
        currentStep: session.currentStep,
        analysis: session.analysis,
        outline: session.outline,
        breakdown: session.breakdown,
        chapters: session.chapters,
        compressedContext: session.compressedContext ?? '',
      });
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
      characterCards: '',
      styleGuide: '',
      compressionOutline: '',
      evidencePack: '',
      compressedContext: '',
      compressionMeta: undefined,
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
        characterCards: latest.characterCards ?? '',
        styleGuide: latest.styleGuide ?? '',
        compressionOutline: latest.compressionOutline ?? '',
        evidencePack: latest.evidencePack ?? '',
        compressedContext: latest.compressedContext ?? '',
        compressionMeta: latest.compressionMeta,
      });
    }
    await get().loadSessions();
  },
}));
