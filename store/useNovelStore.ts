import { create } from 'zustand';

interface NovelState {
  originalNovel: string;
  wordCount: number;
  
  // Workflow state
  currentStep: number;
  analysis: string;
  outline: string;
  outlineDirection: string;
  chapters: string[];
  
  // Actions
  setNovel: (content: string) => void;
  setStep: (step: number) => void;
  reset: () => void;
}

export const useNovelStore = create<NovelState>((set) => ({
  originalNovel: '',
  wordCount: 0,
  currentStep: 1,
  analysis: '',
  outline: '',
  outlineDirection: '',
  chapters: [],

  setNovel: (content: string) => {
    // Basic CJK + English word count
    const count = content.trim() ? content.trim().length : 0;
    set({ originalNovel: content, wordCount: count });
  },

  setStep: (step: number) => set({ currentStep: step }),

  reset: () => set({
    originalNovel: '',
    wordCount: 0,
    currentStep: 1,
    analysis: '',
    outline: '',
    outlineDirection: '',
    chapters: [],
  }),
}));
