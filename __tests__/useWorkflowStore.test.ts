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
});
