import React, { useEffect } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkflowOrchestrator } from '../hooks/useWorkflowOrchestrator';
import { useNovelStore } from '../store/useNovelStore';
import { useWorkflowStore, WorkflowStepId } from '../store/useWorkflowStore';

let handleStepCompletionRef: ((stepId: WorkflowStepId, content: string) => Promise<void>) | null = null;

function Harness() {
  const { handleStepCompletion } = useWorkflowOrchestrator();
  useEffect(() => {
    handleStepCompletionRef = handleStepCompletion;
    return () => {
      handleStepCompletionRef = null;
    };
  }, [handleStepCompletion]);
  return null;
}

function createApplyStepResultMock() {
  return vi.fn(async (stepId: WorkflowStepId, content: string) => {
    useNovelStore.setState((state) => {
      if (stepId === 'compression') return { compressedContext: content };
      if (stepId === 'analysis') return { analysis: content };
      if (stepId === 'outline') return { outline: content };
      if (stepId === 'breakdown') return { breakdown: content };
      if (stepId === 'chapter1') return { chapters: [content] };
      if (!content.trim()) return {};
      return { chapters: [...state.chapters, content] };
    });
  });
}

async function runCompletion(stepId: WorkflowStepId, content: string, delayMs: number) {
  if (!handleStepCompletionRef) {
    throw new Error('Harness did not initialize handleStepCompletion');
  }
  const pending = handleStepCompletionRef(stepId, content);
  await vi.advanceTimersByTimeAsync(delayMs);
  await pending;
}

describe('useWorkflowOrchestrator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useWorkflowStore.getState().resetWorkflow();
    useNovelStore.setState({
      targetChapterCount: 5,
      chapters: [],
      applyStepResult: createApplyStepResultMock(),
    });
    render(<Harness />);
  });

  afterEach(() => {
    vi.useRealTimers();
    handleStepCompletionRef = null;
  });

  it('transitions analysis to outline without auto-trigger', async () => {
    act(() => {
      useWorkflowStore.getState().setIsGenerating(true);
    });

    await act(async () => {
      await runCompletion('analysis', 'analysis output', 1500);
    });

    const state = useWorkflowStore.getState();
    expect(state.currentStepId).toBe('outline');
    expect(state.autoTriggerStepId).toBeNull();
    expect(state.isGenerating).toBe(false);
  });

  it('keeps outline active without auto-trigger to allow manual decision', async () => {
    await act(async () => {
      await runCompletion('outline', 'outline output', 3500);
    });

    const state = useWorkflowStore.getState();
    expect(state.currentStepId).toBe('outline');
    expect(state.autoTriggerStepId).toBeNull();
  });

  it('queues next continuation in full-auto mode when target not reached', async () => {
    act(() => {
      useWorkflowStore.getState().setAutoMode('full_auto');
      useNovelStore.setState({ chapters: ['ch1', 'ch2'] });
    });

    await act(async () => {
      await runCompletion('continuation', 'ch3', 1000);
    });

    const state = useWorkflowStore.getState();
    expect(state.steps.continuation.status).toBe('idle');
    expect(state.steps.continuation.content).toBe('');
    expect(state.autoTriggerStepId).toBe('continuation');
  });
});
