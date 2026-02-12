import { create } from 'zustand';

export type WorkflowStepId = 'compression' | 'analysis' | 'outline' | 'breakdown' | 'chapter1' | 'continuation';

export interface WorkflowStepState {
  id: WorkflowStepId;
  status: 'idle' | 'streaming' | 'completed' | 'error';
  content: string;
  error?: string;
}

interface WorkflowState {
  steps: Record<WorkflowStepId, WorkflowStepState>;
  currentStepId: WorkflowStepId;
  autoTriggerStepId: WorkflowStepId | null;
  isGenerating: boolean;

  autoMode: 'manual' | 'full_auto' | 'range';
  autoRangeStart: number;
  autoRangeEnd: number;
  maxAutoChapter: number;
  isPaused: boolean;

  startStep: (stepId: WorkflowStepId) => void;
  updateStepContent: (stepId: WorkflowStepId, content: string) => void;
  completeStep: (stepId: WorkflowStepId) => Promise<void>;
  setStepError: (stepId: WorkflowStepId, error: string) => void;
  resetWorkflow: () => void;
  resetAllSteps: () => void;
  forceResetGeneration: () => void;
  hydrateFromNovelSession: (payload: {
    currentStep?: number;
    compressedContext: string;
    analysis: string;
    outline: string;
    breakdown: string;
    chapters: string[];
  }) => void;

  clearAutoTrigger: () => void;
  setAutoTriggerStep: (stepId: WorkflowStepId | null) => void;
  setCurrentStep: (stepId: WorkflowStepId) => void;
  cancelStep: (stepId: WorkflowStepId) => void;
  setIsGenerating: (value: boolean) => void;

  setAutoMode: (mode: 'manual' | 'full_auto' | 'range') => void;
  setAutoRange: (start: number, end: number) => void;
  setMaxAutoChapter: (value: number) => void;
  pauseGeneration: () => void;
  resumeGeneration: () => void;
  resetContinuationStep: (nextAutoTriggerId: WorkflowStepId | null) => void;
}

const INITIAL_STEPS: Record<WorkflowStepId, WorkflowStepState> = {
  compression: { id: 'compression', status: 'idle', content: '' },
  analysis: { id: 'analysis', status: 'idle', content: '' },
  outline: { id: 'outline', status: 'idle', content: '' },
  breakdown: { id: 'breakdown', status: 'idle', content: '' },
  chapter1: { id: 'chapter1', status: 'idle', content: '' },
  continuation: { id: 'continuation', status: 'idle', content: '' },
};

function cloneInitialSteps(): Record<WorkflowStepId, WorkflowStepState> {
  return JSON.parse(JSON.stringify(INITIAL_STEPS)) as Record<WorkflowStepId, WorkflowStepState>;
}

function clampRange(start: number, end: number, maxAutoChapter: number): { start: number; end: number } {
  const clampedStart = Math.max(2, Math.min(start, maxAutoChapter));
  const clampedEnd = Math.max(clampedStart, Math.min(end, maxAutoChapter));
  return { start: clampedStart, end: clampedEnd };
}

function mapCurrentStepToId(step: number): WorkflowStepId {
  if (step <= 1) return 'analysis';
  if (step === 2) return 'outline';
  if (step === 3) return 'breakdown';
  if (step === 4) return 'chapter1';
  return 'continuation';
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  steps: cloneInitialSteps(),
  currentStepId: 'compression',
  autoTriggerStepId: null,
  isGenerating: false,
  autoMode: 'manual',
  autoRangeStart: 2,
  autoRangeEnd: 5,
  maxAutoChapter: 5,
  isPaused: false,

  startStep: (stepId) => {
    set((state) => ({
      steps: {
        ...state.steps,
        [stepId]: {
          ...state.steps[stepId],
          status: 'streaming',
          content: '',
          error: undefined,
        },
      },
      currentStepId: stepId,
      autoTriggerStepId: null,
    }));
  },

  updateStepContent: (stepId, content) => {
    set((state) => ({
      steps: {
        ...state.steps,
        [stepId]: { ...state.steps[stepId], content },
      },
    }));
  },

  completeStep: async (stepId) => {
    set((state) => ({
      steps: {
        ...state.steps,
        [stepId]: {
          ...state.steps[stepId],
          status: 'completed',
          error: undefined,
        },
      },
    }));
  },

  setStepError: (stepId, error) => {
    set((state) => ({
      steps: {
        ...state.steps,
        [stepId]: { ...state.steps[stepId], status: 'error', error },
      },
      autoTriggerStepId: null,
      autoMode: 'manual',
      isGenerating: false,
    }));
  },

  resetWorkflow: () => {
    const maxAutoChapter = get().maxAutoChapter;
    const clamped = clampRange(2, maxAutoChapter, maxAutoChapter);
    set({
      steps: cloneInitialSteps(),
      currentStepId: 'compression',
      autoTriggerStepId: null,
      autoMode: 'manual',
      autoRangeStart: clamped.start,
      autoRangeEnd: clamped.end,
      isPaused: false,
      isGenerating: false,
    });
  },

  resetAllSteps: () => {
    const maxAutoChapter = get().maxAutoChapter;
    const clamped = clampRange(2, maxAutoChapter, maxAutoChapter);
    set({
      steps: cloneInitialSteps(),
      currentStepId: 'compression',
      autoTriggerStepId: null,
      autoMode: 'manual',
      autoRangeStart: clamped.start,
      autoRangeEnd: clamped.end,
      isPaused: false,
      isGenerating: false,
    });
  },

  forceResetGeneration: () => {
    set({
      isGenerating: false,
      isPaused: false,
      autoTriggerStepId: null,
    });
  },

  hydrateFromNovelSession: ({ currentStep = 1, compressedContext, analysis, outline, breakdown, chapters }) => {
    const normalizedChapters = Array.isArray(chapters) ? chapters : [];
    const chapter1Content = normalizedChapters[0] || '';
    const hasCompression = Boolean(compressedContext.trim());
    const hasProgress = Boolean(
      analysis.trim() ||
      outline.trim() ||
      breakdown.trim() ||
      normalizedChapters.length > 0
    );
    const resolvedCurrentStepId = hasProgress
      ? mapCurrentStepToId(currentStep)
      : (hasCompression ? 'analysis' : 'compression');

    const { maxAutoChapter } = get();
    const clampedRange = clampRange(2, maxAutoChapter, maxAutoChapter);

    set({
      steps: {
        compression: {
          id: 'compression',
          status: hasCompression ? 'completed' : 'idle',
          content: compressedContext,
          error: undefined,
        },
        analysis: {
          id: 'analysis',
          status: analysis.trim() ? 'completed' : 'idle',
          content: analysis,
          error: undefined,
        },
        outline: {
          id: 'outline',
          status: outline.trim() ? 'completed' : 'idle',
          content: outline,
          error: undefined,
        },
        breakdown: {
          id: 'breakdown',
          status: breakdown.trim() ? 'completed' : 'idle',
          content: breakdown,
          error: undefined,
        },
        chapter1: {
          id: 'chapter1',
          status: chapter1Content.trim() ? 'completed' : 'idle',
          content: chapter1Content,
          error: undefined,
        },
        continuation: {
          id: 'continuation',
          status: 'idle',
          content: '',
          error: undefined,
        },
      },
      currentStepId: resolvedCurrentStepId,
      autoTriggerStepId: null,
      autoMode: 'manual',
      autoRangeStart: clampedRange.start,
      autoRangeEnd: clampedRange.end,
      isPaused: false,
      isGenerating: false,
    });
  },

  clearAutoTrigger: () => {
    set({ autoTriggerStepId: null });
  },

  setAutoTriggerStep: (stepId) => {
    set({ autoTriggerStepId: stepId });
  },

  setCurrentStep: (stepId) => {
    set({ currentStepId: stepId });
  },

  cancelStep: (stepId) => {
    set((state) => ({
      steps: {
        ...state.steps,
        [stepId]: { ...state.steps[stepId], status: 'idle' },
      },
    }));
  },

  setIsGenerating: (value) => {
    set({ isGenerating: value });
  },

  setAutoMode: (mode) => {
    set({ autoMode: mode });
  },

  setAutoRange: (start, end) => {
    const { maxAutoChapter } = get();
    const clamped = clampRange(start, end, maxAutoChapter);
    set({
      autoRangeStart: clamped.start,
      autoRangeEnd: clamped.end,
    });
  },

  setMaxAutoChapter: (value) => {
    const maxAutoChapter = Math.max(2, value);
    const { autoRangeStart, autoRangeEnd } = get();
    const clamped = clampRange(autoRangeStart, autoRangeEnd, maxAutoChapter);
    set({
      maxAutoChapter,
      autoRangeStart: clamped.start,
      autoRangeEnd: clamped.end,
    });
  },

  pauseGeneration: () => {
    const { currentStepId, cancelStep } = get();
    set({
      isPaused: true,
      isGenerating: false,
      autoTriggerStepId: null,
    });
    cancelStep(currentStepId);
  },

  resumeGeneration: () => {
    const { currentStepId } = get();
    set({
      isPaused: false,
      autoTriggerStepId: currentStepId,
    });
  },

  resetContinuationStep: (nextAutoTriggerId) => {
    set((state) => ({
      steps: {
        ...state.steps,
        continuation: {
          ...state.steps.continuation,
          status: 'idle',
          content: '',
          error: undefined,
        },
      },
      autoTriggerStepId: nextAutoTriggerId,
    }));
  },
}));
