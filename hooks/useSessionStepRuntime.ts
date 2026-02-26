'use client';

import { useShallow } from 'zustand/react/shallow';
import { useNovelStore } from '@/store/useNovelStore';
import { useRunSchedulerStore } from '@/store/useRunSchedulerStore';
import type { WorkflowStepId } from '@/store/useWorkflowStore';

export function useSessionStepRuntime(stepId: WorkflowStepId) {
  const { currentSessionId, runStatus, recoverableStepId } = useNovelStore(
    useShallow((state) => ({
      currentSessionId: state.currentSessionId,
      runStatus: state.runStatus,
      recoverableStepId: state.recoverableStepId,
    }))
  );
  const runtime = useRunSchedulerStore((state) => (
    currentSessionId ? state.sessionStates[currentSessionId] : undefined
  ));

  const effectiveStatus = runtime?.status ?? runStatus;
  const effectiveStepId = runtime?.activeStepId ?? recoverableStepId;
  const isQueuedOrRunningForStep = (
    (effectiveStatus === 'queued' || effectiveStatus === 'running') &&
    effectiveStepId === stepId
  );

  return {
    currentSessionId,
    effectiveStatus,
    effectiveStepId,
    isQueuedOrRunningForStep,
  };
}

