import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useWorkflowStore } from '../store/useWorkflowStore';

describe('useWorkflowStore', () => {
  beforeEach(() => {
    act(() => {
      useWorkflowStore.getState().resetWorkflow();
      useWorkflowStore.getState().setMaxAutoChapter(5);
    });
  });

  it('initializes with idle steps', () => {
    const state = useWorkflowStore.getState();
    expect(state.currentStepId).toBe('compression');
    expect(state.steps.analysis.status).toBe('idle');
    expect(state.autoTriggerStepId).toBeNull();
  });

  it('starts and completes a step', async () => {
    act(() => {
      useWorkflowStore.getState().startStep('analysis');
      useWorkflowStore.getState().updateStepContent('analysis', 'done');
    });
    expect(useWorkflowStore.getState().steps.analysis.status).toBe('streaming');

    await act(async () => {
      await useWorkflowStore.getState().completeStep('analysis');
    });

    expect(useWorkflowStore.getState().steps.analysis.status).toBe('completed');
    expect(useWorkflowStore.getState().steps.analysis.content).toBe('done');
  });

  it('sets step error and resets generation flags', () => {
    act(() => {
      useWorkflowStore.getState().setIsGenerating(true);
      useWorkflowStore.getState().setAutoMode('full_auto');
      useWorkflowStore.getState().setStepError('analysis', 'boom');
    });

    const state = useWorkflowStore.getState();
    expect(state.steps.analysis.status).toBe('error');
    expect(state.autoMode).toBe('manual');
    expect(state.isGenerating).toBe(false);
    expect(state.autoTriggerStepId).toBeNull();
  });

  it('clamps auto range by max auto chapter', () => {
    act(() => {
      useWorkflowStore.getState().setMaxAutoChapter(5);
      useWorkflowStore.getState().setAutoRange(2, 10);
    });

    const state = useWorkflowStore.getState();
    expect(state.autoRangeStart).toBe(2);
    expect(state.autoRangeEnd).toBe(5);
  });

  it('re-clamps range when max auto chapter is lowered', () => {
    act(() => {
      useWorkflowStore.getState().setAutoRange(2, 7);
      useWorkflowStore.getState().setMaxAutoChapter(4);
    });

    const state = useWorkflowStore.getState();
    expect(state.maxAutoChapter).toBe(4);
    expect(state.autoRangeEnd).toBe(4);
  });

  it('pauses and resumes generation', () => {
    act(() => {
      useWorkflowStore.getState().startStep('continuation');
      useWorkflowStore.getState().pauseGeneration();
    });
    expect(useWorkflowStore.getState().isPaused).toBe(true);
    expect(useWorkflowStore.getState().steps.continuation.status).toBe('idle');

    act(() => {
      useWorkflowStore.getState().resumeGeneration();
    });
    expect(useWorkflowStore.getState().isPaused).toBe(false);
    expect(useWorkflowStore.getState().autoTriggerStepId).toBe('continuation');
  });

  it('resets continuation step for next chapter loop', () => {
    act(() => {
      useWorkflowStore.getState().updateStepContent('continuation', 'chapter text');
      useWorkflowStore.getState().resetContinuationStep('continuation');
    });

    const state = useWorkflowStore.getState();
    expect(state.steps.continuation.status).toBe('idle');
    expect(state.steps.continuation.content).toBe('');
    expect(state.autoTriggerStepId).toBe('continuation');
  });

  it('hydrates workflow state from persisted session', () => {
    act(() => {
      useWorkflowStore.getState().hydrateFromNovelSession({
        currentStep: 3,
        compressedContext: 'compressed',
        analysis: 'analysis',
        outline: 'outline',
        breakdown: '',
        chapters: ['chapter 1'],
      });
    });

    const state = useWorkflowStore.getState();
    expect(state.steps.compression.status).toBe('completed');
    expect(state.steps.analysis.status).toBe('completed');
    expect(state.steps.outline.status).toBe('completed');
    expect(state.steps.chapter1.status).toBe('completed');
    expect(state.currentStepId).toBe('breakdown');
  });
});
