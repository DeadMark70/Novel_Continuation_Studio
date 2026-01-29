import { useWorkflowStore } from '../store/useWorkflowStore';
import { act } from '@testing-library/react';
import { vi } from 'vitest';

// Mock useNovelStore
const mockUpdateWorkflow = vi.fn().mockResolvedValue(undefined);

vi.mock('../store/useNovelStore', () => ({
  useNovelStore: {
    getState: () => ({
      updateWorkflow: mockUpdateWorkflow,
    }),
  },
}));

describe('useWorkflowStore', () => {
  beforeEach(() => {
    mockUpdateWorkflow.mockClear();
    act(() => {
      useWorkflowStore.getState().resetWorkflow();
    });
  });

  it('should initialize with idle steps', () => {
    const state = useWorkflowStore.getState();
    expect(state.steps.analysis.status).toBe('idle');
    expect(state.currentStepId).toBe('analysis');
  });

  it('should transition to streaming on startStep', () => {
    act(() => {
      useWorkflowStore.getState().startStep('analysis');
    });
    const state = useWorkflowStore.getState();
    expect(state.steps.analysis.status).toBe('streaming');
  });

  it('should update content', () => {
    act(() => {
      useWorkflowStore.getState().updateStepContent('analysis', 'New content');
    });
    const state = useWorkflowStore.getState();
    expect(state.steps.analysis.content).toBe('New content');
  });

  it('should complete step and sync with novel store', async () => {
    await act(async () => {
      await useWorkflowStore.getState().completeStep('analysis');
    });
    const state = useWorkflowStore.getState();
    expect(state.steps.analysis.status).toBe('completed');
    expect(mockUpdateWorkflow).toHaveBeenCalled();
  });

  it('should auto-progress to outline (idle) after analysis completes', async () => {
    await act(async () => {
      await useWorkflowStore.getState().completeStep('analysis');
    });
    const state = useWorkflowStore.getState();
    expect(state.currentStepId).toBe('outline');
    expect(state.autoTriggerStepId).toBeNull(); // Pause point
  });

  it('should auto-trigger breakdown after outline completes', async () => {
    await act(async () => {
      await useWorkflowStore.getState().completeStep('outline');
    });
    const state = useWorkflowStore.getState();
    expect(state.currentStepId).toBe('breakdown');
    expect(state.autoTriggerStepId).toBe('breakdown');
  });

  it('should auto-trigger chapter1 after breakdown completes', async () => {
    await act(async () => {
      await useWorkflowStore.getState().completeStep('breakdown');
    });
    const state = useWorkflowStore.getState();
    expect(state.currentStepId).toBe('chapter1');
    expect(state.autoTriggerStepId).toBe('chapter1');
  });

  it('should NOT auto-trigger continuation after chapter1 completes', async () => {
    await act(async () => {
      await useWorkflowStore.getState().completeStep('chapter1');
    });
    const state = useWorkflowStore.getState();
    expect(state.currentStepId).toBe('continuation');
    expect(state.autoTriggerStepId).toBeNull();
  });
});
