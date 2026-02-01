import { useWorkflowStore } from '../store/useWorkflowStore';
import { act } from '@testing-library/react';
import { vi } from 'vitest';

// Mock useNovelStore
const mockUpdateWorkflow = vi.fn().mockResolvedValue(undefined);
const mockStartNewSession = vi.fn();

vi.mock('../store/useNovelStore', () => ({
  useNovelStore: {
    getState: () => ({
      updateWorkflow: mockUpdateWorkflow,
      startNewSession: mockStartNewSession,
      analysis: '',
      outline: '',
      breakdown: '',
      chapters: []
    }),
  },
}));

describe('useWorkflowStore', () => {
  beforeEach(() => {
    mockUpdateWorkflow.mockClear();
    mockStartNewSession.mockClear();
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
    // Verify session started
    // expect(mockStartNewSession).toHaveBeenCalled(); // Removed as session start is moved
  });

  it('should update content', () => {
    act(() => {
      useWorkflowStore.getState().updateStepContent('analysis', 'New content');
    });
    const state = useWorkflowStore.getState();
    expect(state.steps.analysis.content).toBe('New content');
  });

  it('should complete step and sync with novel store', async () => {
    // Set content first to pass validation
    act(() => {
      useWorkflowStore.getState().updateStepContent('analysis', 'Analysis Content');
    });
    
    await act(async () => {
      await useWorkflowStore.getState().completeStep('analysis');
    });
    const state = useWorkflowStore.getState();
    expect(state.steps.analysis.status).toBe('completed');
    expect(mockUpdateWorkflow).toHaveBeenCalled();
  });

  it('should auto-progress to outline (idle) after analysis completes', async () => {
    act(() => {
      useWorkflowStore.getState().updateStepContent('analysis', 'Analysis Content');
    });
    await act(async () => {
      await useWorkflowStore.getState().completeStep('analysis');
    });
    const state = useWorkflowStore.getState();
    expect(state.currentStepId).toBe('outline');
    expect(state.autoTriggerStepId).toBeNull(); // Pause point
  });

  it('should auto-trigger breakdown after outline completes', async () => {
    act(() => {
      useWorkflowStore.getState().updateStepContent('outline', 'Outline Content');
    });
    await act(async () => {
      await useWorkflowStore.getState().completeStep('outline');
    });
    const state = useWorkflowStore.getState();
    expect(state.currentStepId).toBe('breakdown');
    expect(state.autoTriggerStepId).toBe('breakdown');
  });

  it('should auto-trigger chapter1 after breakdown completes', async () => {
    act(() => {
      useWorkflowStore.getState().updateStepContent('breakdown', 'Breakdown Content');
    });
    await act(async () => {
      await useWorkflowStore.getState().completeStep('breakdown');
    });
    const state = useWorkflowStore.getState();
    expect(state.currentStepId).toBe('chapter1');
    expect(state.autoTriggerStepId).toBe('chapter1');
  });

  it('should NOT auto-trigger continuation after chapter1 completes', async () => {
    act(() => {
      useWorkflowStore.getState().updateStepContent('chapter1', 'Chapter 1 Content');
    });
    await act(async () => {
      await useWorkflowStore.getState().completeStep('chapter1');
    });
    const state = useWorkflowStore.getState();
    expect(state.currentStepId).toBe('continuation');
    expect(state.autoTriggerStepId).toBeNull();
  });
});

describe('useWorkflowStore - Automation', () => {
  beforeEach(() => {
    act(() => {
      useWorkflowStore.getState().resetWorkflow();
    });
  });

  it('should set auto mode correctly', () => {
    act(() => {
      // @ts-ignore
      if (useWorkflowStore.getState().setAutoMode) {
        // @ts-ignore
        useWorkflowStore.getState().setAutoMode('full_auto');
      }
    });
    // @ts-ignore
    const state = useWorkflowStore.getState();
    // @ts-ignore
    if (state.autoMode) {
        // @ts-ignore
      expect(state.autoMode).toBe('full_auto');
    } else {
        // Fail if property doesn't exist yet (TDD Red)
        expect(state).toHaveProperty('autoMode');
    }
  });

  it('should set auto range correctly', () => {
    act(() => {
        // @ts-ignore
      if (useWorkflowStore.getState().setAutoRange) {
        // @ts-ignore
        useWorkflowStore.getState().setAutoRange(2, 4);
      }
    });
    const state = useWorkflowStore.getState();
    // @ts-ignore
    if (state.autoRangeStart) {
        // @ts-ignore
      expect(state.autoRangeStart).toBe(2);
      // @ts-ignore
      expect(state.autoRangeEnd).toBe(4);
    } else {
        expect(state).toHaveProperty('autoRangeStart');
    }
  });

  it('should pause generation and abort active step', () => {
    act(() => {
      useWorkflowStore.getState().startStep('continuation');
    });
    
    act(() => {
        // @ts-ignore
      if (useWorkflowStore.getState().pauseGeneration) {
        // @ts-ignore
        useWorkflowStore.getState().pauseGeneration();
      }
    });
    
    const state = useWorkflowStore.getState();
    // @ts-ignore
    if (state.isPaused !== undefined) {
        // @ts-ignore
      expect(state.isPaused).toBe(true);
      // Should also ensure generating mutex is released or step is cancelled
      expect(state.isGenerating).toBe(false);
    } else {
        expect(state).toHaveProperty('isPaused');
    }
  });

  it('should resume generation', () => {
    act(() => {
        // @ts-ignore
      if (useWorkflowStore.getState().pauseGeneration) {
        // @ts-ignore
        useWorkflowStore.getState().pauseGeneration();
      }
    });
    
    act(() => {
        // @ts-ignore
      if (useWorkflowStore.getState().resumeGeneration) {
        // @ts-ignore
        useWorkflowStore.getState().resumeGeneration();
      }
    });
    
    const state = useWorkflowStore.getState();
    // @ts-ignore
    if (state.isPaused !== undefined) {
        // @ts-ignore
      expect(state.isPaused).toBe(false);
      // Resume should trigger current step
      expect(state.autoTriggerStepId).toBe(state.currentStepId);
    } else {
         expect(state).toHaveProperty('isPaused');
    }
  });
});