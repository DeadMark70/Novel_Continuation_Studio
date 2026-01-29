import { create } from 'zustand';
import { saveNovel, getLatestNovel } from '@/lib/db';

interface NovelState {
  originalNovel: string;
  wordCount: number;
  
  // Workflow state
  currentStep: number;
  analysis: string;
  outline: string;
  outlineDirection: string;
  breakdown: string; // Added breakdown
  chapters: string[];
  
  // Actions
  setNovel: (content: string) => Promise<void>;
  setStep: (step: number) => Promise<void>;
  updateWorkflow: (data: Partial<Omit<NovelState, 'setNovel' | 'setStep' | 'updateWorkflow' | 'reset' | 'initialize' | 'persist'>>) => Promise<void>;
  reset: () => Promise<void>;
  initialize: () => Promise<void>;
  persist: () => Promise<void>;
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

  setNovel: async (content: string) => {
    const count = content.trim() ? content.trim().length : 0;
    set({ originalNovel: content, wordCount: count });
    await get().persist();
  },

  setStep: async (step: number) => {
    set({ currentStep: step });
    await get().persist();
  },

  updateWorkflow: async (data: Partial<Omit<NovelState, 'setNovel' | 'setStep' | 'updateWorkflow' | 'reset' | 'initialize' | 'persist'>>) => {
    set((state) => ({ ...state, ...data }));
    await get().persist();
  },

  persist: async () => {
    const state = get();
    await saveNovel({
      content: state.originalNovel,
      wordCount: state.wordCount,
      currentStep: state.currentStep,
      analysis: state.analysis,
      outline: state.outline,
      outlineDirection: state.outlineDirection,
      chapters: state.chapters,
    });
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
        chapters: latest.chapters,
        // Assuming we update db schema later to include breakdown, or it just won't be persisted yet in old records
      });
    }
  },
}));