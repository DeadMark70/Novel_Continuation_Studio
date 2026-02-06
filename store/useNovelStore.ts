import { create } from 'zustand';
import { saveNovel, getLatestNovel, getAllSessions, getSession, deleteSession, generateSessionId, type NovelEntry } from '@/lib/db';
import { useWorkflowStore } from './useWorkflowStore';
import { normalizeNovelText } from '@/lib/utils';

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
  
  // Session list (history)
  sessions: NovelEntry[];
  
  // Actions
  setNovel: (content: string) => Promise<void>;
  setStep: (step: number) => Promise<void>;
  updateWorkflow: (data: Partial<Pick<NovelState, 'analysis' | 'outline' | 'outlineDirection' | 'breakdown' | 'chapters'>>) => Promise<void>;
  setOutlineDirection: (value: string) => Promise<void>;
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
      });
      useWorkflowStore.getState().hydrateFromNovelSession({
        currentStep: session.currentStep,
        analysis: session.analysis,
        outline: session.outline,
        breakdown: session.breakdown,
        chapters: session.chapters,
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
      });
    }
    await get().loadSessions();
  },
}));
