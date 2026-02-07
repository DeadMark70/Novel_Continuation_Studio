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
  
  // Automation State
  autoMode: 'manual' | 'full_auto' | 'range';
  autoRangeStart: number;
  autoRangeEnd: number;
  isPaused: boolean;

  // Actions

  startStep: (stepId: WorkflowStepId) => void;

  updateStepContent: (stepId: WorkflowStepId, content: string) => void;

  completeStep: (stepId: WorkflowStepId) => Promise<void>;

  setStepError: (stepId: WorkflowStepId, error: string) => void;

  resetWorkflow: () => void;
  resetAllSteps: () => void;
  forceResetGeneration: () => void;
  hydrateFromNovelSession: (payload: {
    currentStep?: number;
    analysis: string;
    outline: string;
    breakdown: string;
    chapters: string[];
  }) => void;

  clearAutoTrigger: () => void;
  
  setCurrentStep: (stepId: WorkflowStepId) => void;

  cancelStep: (stepId: WorkflowStepId) => void;

  setIsGenerating: (value: boolean) => void; // ✅ Action to set mutex lock
  
  // Automation Actions
  setAutoMode: (mode: 'manual' | 'full_auto' | 'range') => void;
  setAutoRange: (start: number, end: number) => void;
  pauseGeneration: () => void;
  resumeGeneration: () => void;

}



const INITIAL_STEPS: Record<WorkflowStepId, WorkflowStepState> = {

  analysis: { id: 'analysis', status: 'idle', content: '' },

  outline: { id: 'outline', status: 'idle', content: '' },

  breakdown: { id: 'breakdown', status: 'idle', content: '' },

  chapter1: { id: 'chapter1', status: 'idle', content: '' },

  continuation: { id: 'continuation', status: 'idle', content: '' },

};

function getTargetChapterCount(): number {
  try {
    const target = useNovelStore.getState().targetChapterCount ?? 5;
    return Math.max(2, target);
  } catch {
    return 5;
  }
}



export const useWorkflowStore = create<WorkflowState>((set, get) => ({

  steps: JSON.parse(JSON.stringify(INITIAL_STEPS)),

  currentStepId: 'analysis',

  autoTriggerStepId: null,

  isGenerating: false, // ✅ Global mutex lock initial value
  
  autoMode: 'manual',
  autoRangeStart: 2,
  autoRangeEnd: getTargetChapterCount(),
  isPaused: false,


  startStep: (stepId) => {
    // Note: Session creation is now handled by setNovel() when user uploads a new novel
    // Do NOT call startNewSession here as it clears the novel content

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
      set({ isGenerating: false });
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
      
      // Get fresh state for chapters count
      const updatedNovelStore = useNovelStore.getState();
      const currentChapterCount = updatedNovelStore.chapters ? updatedNovelStore.chapters.length : 0;
      const targetChapterCount = Math.max(2, updatedNovelStore.targetChapterCount ?? 5);
      const { autoMode, autoRangeEnd, isPaused } = get();
      
      console.log(`[Workflow] Continuation complete. Total chapters: ${currentChapterCount}/${targetChapterCount}. AutoMode: ${autoMode}, Paused: ${isPaused}`);
      
      let nextAutoTriggerId: WorkflowStepId | null = null;

      if (currentChapterCount >= targetChapterCount) {
         console.log(`[Workflow] Target reached at ${targetChapterCount} chapters.`);
      } else if (isPaused) {
         console.log('[Workflow] Generation paused by user');
      } else {
         let shouldAutoTrigger = false;
         const nextChapter = currentChapterCount + 1;

         if (autoMode === 'full_auto') {
           shouldAutoTrigger = true;
         } else if (autoMode === 'range') {
           shouldAutoTrigger = nextChapter <= autoRangeEnd;
         }

         if (shouldAutoTrigger) {
            console.log(`[Workflow] Auto-triggering next chapter: ${nextChapter}`);
            nextAutoTriggerId = 'continuation';
         } else {
            console.log(`[Workflow] Auto-trigger condition not met. Stopping.`);
         }
      }
      
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
        autoTriggerStepId: nextAutoTriggerId
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

      autoTriggerStepId: null, // Stop automation on error
      
      autoMode: 'manual', // Force switch to manual on error
      
      isGenerating: false // Release lock if it was held (safety)

    }));

  },



  resetWorkflow: () => {

    set({

      steps: JSON.parse(JSON.stringify(INITIAL_STEPS)),

      currentStepId: 'analysis',

      autoTriggerStepId: null,
      
      autoMode: 'manual',
      autoRangeStart: 2,
      autoRangeEnd: getTargetChapterCount(),
      isPaused: false,
      isGenerating: false

    });

  },

  resetAllSteps: () => {
    set({
      steps: JSON.parse(JSON.stringify(INITIAL_STEPS)),
      currentStepId: 'analysis',
      autoTriggerStepId: null,
      autoMode: 'manual',
      autoRangeStart: 2,
      autoRangeEnd: getTargetChapterCount(),
      isPaused: false,
      isGenerating: false
    });
  },

  forceResetGeneration: () => {
    set({
      isGenerating: false,
      isPaused: false,
      autoTriggerStepId: null
    });
  },

  hydrateFromNovelSession: ({ currentStep = 1, analysis, outline, breakdown, chapters }) => {
    const mapCurrentStepToId = (step: number): WorkflowStepId => {
      if (step <= 1) return 'analysis';
      if (step === 2) return 'outline';
      if (step === 3) return 'breakdown';
      if (step === 4) return 'chapter1';
      return 'continuation';
    };

    const normalizedChapters = Array.isArray(chapters) ? chapters : [];
    const chapter1Content = normalizedChapters[0] || '';

    set({
      steps: {
        analysis: {
          id: 'analysis',
          status: analysis.trim() ? 'completed' : 'idle',
          content: analysis,
          error: undefined
        },
        outline: {
          id: 'outline',
          status: outline.trim() ? 'completed' : 'idle',
          content: outline,
          error: undefined
        },
        breakdown: {
          id: 'breakdown',
          status: breakdown.trim() ? 'completed' : 'idle',
          content: breakdown,
          error: undefined
        },
        chapter1: {
          id: 'chapter1',
          status: chapter1Content.trim() ? 'completed' : 'idle',
          content: chapter1Content,
          error: undefined
        },
        continuation: {
          id: 'continuation',
          status: 'idle',
          content: '',
          error: undefined
        }
      },
      currentStepId: mapCurrentStepToId(currentStep),
      autoTriggerStepId: null,
      autoMode: 'manual',
      autoRangeStart: 2,
      autoRangeEnd: getTargetChapterCount(),
      isPaused: false,
      isGenerating: false
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
  },
  
  setAutoMode: (mode) => {
    set({ autoMode: mode });
  },
  
  setAutoRange: (start, end) => {
    const maxChapter = getTargetChapterCount();
    const clampedStart = Math.max(2, Math.min(start, maxChapter));
    const clampedEnd = Math.max(clampedStart, Math.min(end, maxChapter));
    set({ autoRangeStart: clampedStart, autoRangeEnd: clampedEnd });
  },
  
  pauseGeneration: () => {
    const { currentStepId, cancelStep } = get();
    console.log(`[Workflow] Pausing generation. Aborting current step: ${currentStepId}`);
    
    // Set paused state
    set({ 
        isPaused: true,
        isGenerating: false // Release lock
    });
    
    // Abort current step (reset to idle)
    cancelStep(currentStepId);
  },
  
  resumeGeneration: () => {
    const { currentStepId } = get();
    console.log(`[Workflow] Resuming generation from step: ${currentStepId}`);
    
    set({ 
        isPaused: false,
        autoTriggerStepId: currentStepId // Trigger immediately
    });
  }

}));
