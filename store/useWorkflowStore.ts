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

  autoTriggerStepId: WorkflowStepId | null;

  

  // Actions

  startStep: (stepId: WorkflowStepId) => void;

  updateStepContent: (stepId: WorkflowStepId, content: string) => void;

  completeStep: (stepId: WorkflowStepId) => Promise<void>;

  setStepError: (stepId: WorkflowStepId, error: string) => void;

  resetWorkflow: () => void;

  clearAutoTrigger: () => void;

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

  autoTriggerStepId: null,



  startStep: (stepId) => {

    set((state) => ({

      steps: {

        ...state.steps,

        [stepId]: { ...state.steps[stepId], status: 'streaming', error: undefined }

      },

      currentStepId: stepId,

      autoTriggerStepId: null // Clear trigger when manually starting or when trigger is consumed

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

    }



    // Sync other fields

    await novelStore.updateWorkflow({

      analysis: steps.analysis.content,

      outline: steps.outline.content,

      breakdown: steps.breakdown.content,

    });



    // Automation Logic

    if (stepId === 'analysis') {

      set({ currentStepId: 'outline', autoTriggerStepId: null }); // Pause at outline

    } else if (stepId === 'outline') {

      set({ currentStepId: 'breakdown', autoTriggerStepId: 'breakdown' }); // Auto-start breakdown

    } else if (stepId === 'breakdown') {

      set({ currentStepId: 'chapter1', autoTriggerStepId: 'chapter1' }); // Auto-start chapter1

    } else if (stepId === 'chapter1') {

      set({ currentStepId: 'continuation', autoTriggerStepId: null }); // End automation

    }

  },



  setStepError: (stepId, error) => {

    set((state) => ({

      steps: {

        ...state.steps,

        [stepId]: { ...state.steps[stepId], status: 'error', error }

      },

      autoTriggerStepId: null // Stop automation on error

    }));

  },



  resetWorkflow: () => {

    set({

      steps: JSON.parse(JSON.stringify(INITIAL_STEPS)),

      currentStepId: 'analysis',

      autoTriggerStepId: null

    });

  },



  clearAutoTrigger: () => {

    set({ autoTriggerStepId: null });

  }

}));
