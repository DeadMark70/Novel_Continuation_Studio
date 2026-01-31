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

  isGenerating: boolean; // ✅ Global mutex lock for generation

  // Actions

  startStep: (stepId: WorkflowStepId) => void;

  updateStepContent: (stepId: WorkflowStepId, content: string) => void;

  completeStep: (stepId: WorkflowStepId) => Promise<void>;

  setStepError: (stepId: WorkflowStepId, error: string) => void;

  resetWorkflow: () => void;

  clearAutoTrigger: () => void;
  
  setCurrentStep: (stepId: WorkflowStepId) => void;

  cancelStep: (stepId: WorkflowStepId) => void;

  setIsGenerating: (value: boolean) => void; // ✅ Action to set mutex lock

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

  isGenerating: false, // ✅ Global mutex lock initial value



  startStep: (stepId) => {
    // When starting Phase 1 (analysis), create a new session
    if (stepId === 'analysis') {
      useNovelStore.getState().startNewSession();
      console.log('[Workflow] Started new session for analysis.');
    }

    set((state) => ({

      steps: {

        ...state.steps,

        [stepId]: { 
          ...state.steps[stepId], 
          status: 'streaming', 
          content: '', // Reset content on start for cleaner UX
          error: undefined 
        }

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

    console.log(`[CompleteStep] Syncing ${stepId} to novelStore. Content lengths: analysis=${steps.analysis.content.length}, outline=${steps.outline.content.length}, breakdown=${steps.breakdown.content.length}`);

    await novelStore.updateWorkflow({

      analysis: steps.analysis.content,

      outline: steps.outline.content,

      breakdown: steps.breakdown.content,

    });

    // Verify sync worked
    const verifyNovelStore = useNovelStore.getState();
    console.log(`[CompleteStep] After sync verification: analysis=${verifyNovelStore.analysis.length}, outline=${verifyNovelStore.outline.length}, breakdown=${verifyNovelStore.breakdown.length}`);



    // Automation Logic
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // ✅ CRITICAL: Additional delay to ensure novelStore state has fully propagated
    await delay(200);

    // ✅ Safeguard: Verify current step has valid output before auto-triggering
    const currentStepContent = get().steps[stepId].content;
    if (!currentStepContent || currentStepContent.trim().length === 0) {
      console.error(`[Workflow] Cannot auto-trigger next step: ${stepId} has no output (content length: ${currentStepContent?.length || 0})`);
      // Still open the next step panel but don't auto-trigger generation
      if (stepId === 'analysis') {
        set({ currentStepId: 'outline', autoTriggerStepId: null });
      } else if (stepId === 'outline') {
        set({ currentStepId: 'breakdown', autoTriggerStepId: null });
      } else if (stepId === 'breakdown') {
        set({ currentStepId: 'chapter1', autoTriggerStepId: null });
      }
      return;
    }

    console.log(`[Workflow] Step ${stepId} verified with content length: ${currentStepContent.length}. Proceeding with automation.`);

    // Helper to release the generation lock before triggering next step
    const releaseGenerationLock = () => {
      set({ isGenerating: false });
      console.log(`[Workflow] Released isGenerating lock after ${stepId} completed.`);
    };

    if (stepId === 'analysis') {
      // Step 1 -> Step 2: Auto-open Outline but PAUSE (no autoTrigger)
      await delay(1500); // Small delay for UX
      releaseGenerationLock();
      set({ currentStepId: 'outline', autoTriggerStepId: null });
    } else if (stepId === 'outline') {
      // Step 2 -> Step 3: Auto-open AND Auto-start Breakdown
      await delay(3500); // 3.5s wait
      releaseGenerationLock();
      set({ currentStepId: 'breakdown', autoTriggerStepId: 'breakdown' });
    } else if (stepId === 'breakdown') {
      // Step 3 -> Step 4: Auto-open AND Auto-start Chapter 1
      await delay(3500); // 3.5s wait
      releaseGenerationLock();
      set({ currentStepId: 'chapter1', autoTriggerStepId: 'chapter1' });
    } else if (stepId === 'chapter1') {
      // Step 4 -> Step 5: Auto-open Continuation but PAUSE (user reviews chapter 1 first)
      await delay(2000);
      releaseGenerationLock();
      set({ currentStepId: 'continuation', autoTriggerStepId: null });
    } else if (stepId === 'continuation') {
      // Step 5 completed: Reset continuation step to 'idle' so user can write next chapter
      // The chapter has already been appended to chapters array above
      await delay(1000);
      releaseGenerationLock();
      
      // Reset the continuation step to idle with empty content for next chapter
      set((state) => ({
        steps: {
          ...state.steps,
          continuation: { 
            ...state.steps.continuation, 
            status: 'idle', 
            content: '' 
          }
        },
        autoTriggerStepId: null
      }));
      
      console.log(`[Workflow] Continuation chapter saved. Ready for next chapter.`);
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

  },

  setCurrentStep: (stepId) => {
    set({ currentStepId: stepId });
  },

  cancelStep: (stepId) => {
    set((state) => ({
      steps: {
        ...state.steps,
        [stepId]: { ...state.steps[stepId], status: 'idle' }
      }
    }));
  },

  setIsGenerating: (value) => {
    set({ isGenerating: value });
  }

}));
