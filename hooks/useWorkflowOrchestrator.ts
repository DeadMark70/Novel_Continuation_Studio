import { useCallback, useEffect } from 'react';
import { useNovelStore } from '@/store/useNovelStore';
import { WorkflowStepId, useWorkflowStore } from '@/store/useWorkflowStore';

const STEP_TRANSITIONS: Record<
  Exclude<WorkflowStepId, 'continuation'>,
  { nextStep: WorkflowStepId; autoTrigger: WorkflowStepId | null; delayMs: number }
> = {
  compression: { nextStep: 'analysis', autoTrigger: 'analysis', delayMs: 1000 },
  analysis: { nextStep: 'outline', autoTrigger: null, delayMs: 1500 },
  outline: { nextStep: 'breakdown', autoTrigger: 'breakdown', delayMs: 3500 },
  breakdown: { nextStep: 'chapter1', autoTrigger: 'chapter1', delayMs: 3500 },
  chapter1: { nextStep: 'continuation', autoTrigger: null, delayMs: 2000 },
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useWorkflowOrchestrator() {
  const targetChapterCount = useNovelStore((state) => state.targetChapterCount);

  useEffect(() => {
    useWorkflowStore.getState().setMaxAutoChapter(Math.max(2, targetChapterCount ?? 5));
  }, [targetChapterCount]);

  const handleStepCompletion = useCallback(async (stepId: WorkflowStepId, content: string) => {
    const novelStore = useNovelStore.getState();
    const workflowStore = useWorkflowStore.getState();

    await novelStore.applyStepResult(stepId, content);

    const trimmedContent = content.trim();
    const releaseLock = () => {
      useWorkflowStore.getState().setIsGenerating(false);
    };

    if (stepId !== 'continuation') {
      const transition = STEP_TRANSITIONS[stepId];
      if (!trimmedContent) {
        releaseLock();
        workflowStore.setCurrentStep(transition.nextStep);
        workflowStore.setAutoTriggerStep(null);
        return;
      }

      await wait(transition.delayMs);
      releaseLock();
      workflowStore.setCurrentStep(transition.nextStep);
      workflowStore.setAutoTriggerStep(transition.autoTrigger);
      return;
    }

    await wait(1000);
    releaseLock();

    const latestNovelState = useNovelStore.getState();
    const latestWorkflowState = useWorkflowStore.getState();
    const currentChapterCount = latestNovelState.chapters.length;
    const safeTargetChapterCount = Math.max(2, latestNovelState.targetChapterCount ?? 5);
    const nextChapter = currentChapterCount + 1;

    let nextAutoTriggerId: WorkflowStepId | null = null;
    if (currentChapterCount < safeTargetChapterCount && !latestWorkflowState.isPaused) {
      if (latestWorkflowState.autoMode === 'full_auto') {
        nextAutoTriggerId = 'continuation';
      } else if (
        latestWorkflowState.autoMode === 'range' &&
        nextChapter <= latestWorkflowState.autoRangeEnd
      ) {
        nextAutoTriggerId = 'continuation';
      }
    }

    useWorkflowStore.getState().resetContinuationStep(nextAutoTriggerId);
  }, []);

  return {
    handleStepCompletion,
  };
}
