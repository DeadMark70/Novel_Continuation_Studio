import { create } from 'zustand';
import { saveNovel } from '@/lib/db';
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

    // Sync with main NovelStore for persistence
    const { steps } = get();
    // This part bridges the specific workflow steps to the main novel state
    // We might want to move this logic or keep it here for auto-sync
    await useNovelStore.getState().updateWorkflow({
      analysis: steps.analysis.content,
      outline: steps.outline.content,
      // Mapping other steps if needed, or storing raw workflow data
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
