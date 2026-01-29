import { create } from 'zustand';
import { useNovelStore } from './useNovelStore';

export type WorkflowStepId = 'analysis' | 'outline' | 'breakdown' | 'chapter1' | 'continuation';

export interface WorkflowStepState {
  id: WorkflowStepId;
  status: 'idle' | 'streaming' | 'completed' | 'error';
  content: string;
  error?: string;
}

interface WorkflowState {
  steps: Record<WorkflowStepId, WorkflowStepState>;
  currentStepId: WorkflowStepId;
  
  // Actions
  startStep: (stepId: WorkflowStepId) => void;
  updateStepContent: (stepId: WorkflowStepId, content: string) => void;
  completeStep: (stepId: WorkflowStepId) => Promise<void>;
  setStepError: (stepId: WorkflowStepId, error: string) => void;
  resetWorkflow: () => void;
}

const INITIAL_STEPS: Record<WorkflowStepId, WorkflowStepState> = {
  analysis: { id: 'analysis', status: 'idle', content: '' },
  outline: { id: 'outline', status: 'idle', content: '' },
  breakdown: { id: 'breakdown', status: 'idle', content: '' },
  chapter1: { id: 'chapter1', status: 'idle', content: '' },
  continuation: { id: 'continuation', status: 'idle', content: '' },
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  steps: JSON.parse(JSON.stringify(INITIAL_STEPS)),
  currentStepId: 'analysis',

  startStep: (stepId) => {
    set((state) => ({
      steps: {
        ...state.steps,
        [stepId]: { ...state.steps[stepId], status: 'streaming', error: undefined }
      },
      currentStepId: stepId
    }));
  },

  updateStepContent: (stepId, content) => {
    set((state) => ({
      steps: {
        ...state.steps,
        [stepId]: { ...state.steps[stepId], content }
      }
    }));
  },

  completeStep: async (stepId) => {
    set((state) => ({
      steps: {
        ...state.steps,
        [stepId]: { ...state.steps[stepId], status: 'completed' }
      }
    }));

    const { steps } = get();
    const novelStore = useNovelStore.getState();

    // Specific logic for chapters
    if (stepId === 'chapter1') {
      const content = steps.chapter1.content;
      // Replace chapters array with just this one if it's the first
      await novelStore.updateWorkflow({
        chapters: [content]
      });
    } else if (stepId === 'continuation') {
      const content = steps.continuation.content;
      // Append to chapters
      const currentChapters = novelStore.chapters || [];
      await novelStore.updateWorkflow({
        chapters: [...currentChapters, content]
      });
      
      // Optionally clear continuation content for next run? 
      // For now, keep it visible so user sees what was just generated.
      // But we need a way to clear it before *next* generation starts? 
      // `startStep` doesn't clear content by default in my implementation.
      // I should update `startStep` to clear content if it's a fresh start?
      // Or maybe we want to see previous run until new one starts?
      // Let's leave it for now.
    }

    // Sync other fields
    await novelStore.updateWorkflow({
      analysis: steps.analysis.content,
      outline: steps.outline.content,
      breakdown: steps.breakdown.content,
    });
  },

  setStepError: (stepId, error) => {
    set((state) => ({
      steps: {
        ...state.steps,
        [stepId]: { ...state.steps[stepId], status: 'error', error }
      }
    }));
  },

  resetWorkflow: () => {
    set({
      steps: JSON.parse(JSON.stringify(INITIAL_STEPS)),
      currentStepId: 'analysis'
    });
  }
}));