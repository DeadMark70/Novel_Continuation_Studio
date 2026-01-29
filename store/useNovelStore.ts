import { create } from 'zustand';
import { saveNovel, getLatestNovel, getNovelHistory, type NovelEntry } from '@/lib/db';

interface NovelState {
  originalNovel: string;
  wordCount: number;
  
  // Workflow state
  currentStep: number;
  analysis: string;
  outline: string;
  outlineDirection: string;
  breakdown: string;
  chapters: string[];
  
  // History
  history: NovelEntry[];
  
  // Actions
  setNovel: (content: string) => Promise<void>;
  setStep: (step: number) => Promise<void>;
  updateWorkflow: (data: Partial<Omit<NovelState, 'setNovel' | 'setStep' | 'updateWorkflow' | 'reset' | 'initialize' | 'persist' | 'loadHistory' | 'rollbackToVersion'>>) => Promise<void>;
  reset: () => Promise<void>;
  initialize: () => Promise<void>;
  persist: (forceNew?: boolean) => Promise<void>;
  loadHistory: () => Promise<void>;
  rollbackToVersion: (version: NovelEntry) => Promise<void>;
}

export const useNovelStore = create<NovelState>((set, get) => ({
  originalNovel: '',
  wordCount: 0,
  currentStep: 1,
  analysis: '',
  outline: '',
  outlineDirection: '',
  breakdown: '',
  chapters: [],
  history: [],

  setNovel: async (content: string) => {
    const count = content.trim() ? content.trim().length : 0;
    set({ originalNovel: content, wordCount: count });
    await get().persist();
  },

  setStep: async (step: number) => {
    set({ currentStep: step });
    await get().persist();
  },

  updateWorkflow: async (data: Partial<Omit<NovelState, 'setNovel' | 'setStep' | 'updateWorkflow' | 'reset' | 'initialize' | 'persist' | 'loadHistory' | 'rollbackToVersion'>>) => {
    set((state) => ({ ...state, ...data }));
    await get().persist();
  },

  persist: async (forceNew = false) => {
    const state = get();
    await saveNovel({
      content: state.originalNovel,
      wordCount: state.wordCount,
      currentStep: state.currentStep,
      analysis: state.analysis,
      outline: state.outline,
      outlineDirection: state.outlineDirection,
      breakdown: state.breakdown,
      chapters: state.chapters,
    }, forceNew);
    await get().loadHistory();
  },

  loadHistory: async () => {
    const history = await getNovelHistory();
    set({ history });
  },

  rollbackToVersion: async (version: NovelEntry) => {
    // Save current state as a new version before rolling back (non-destructive)
    await get().persist(true);
    
    // Update current state to version
    set({
      originalNovel: version.content,
      wordCount: version.wordCount,
      currentStep: version.currentStep,
      analysis: version.analysis,
      outline: version.outline,
      outlineDirection: version.outlineDirection,
      breakdown: version.breakdown,
      chapters: version.chapters,
    });
    
    // Save the "rolled back" state as the latest entry
    await get().persist();
  },

  reset: async () => {
    set({
      originalNovel: '',
      wordCount: 0,
      currentStep: 1,
      analysis: '',
      outline: '',
      outlineDirection: '',
      breakdown: '',
      chapters: [],
    });
    await get().persist();
  },

  initialize: async () => {
    const latest = await getLatestNovel();
    if (latest) {
      set({
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
    await get().loadHistory();
  },
}));