import { useWorkflowStore } from '../store/useWorkflowStore';
import { act } from '@testing-library/react';
import { vi } from 'vitest';

// Mock useNovelStore
const mockUpdateWorkflow = vi.fn().mockResolvedValue(undefined);
const mockStartNewSession = vi.fn();
const mockGetState = vi.fn();

vi.mock('../store/useNovelStore', () => ({
  useNovelStore: {
    getState: () => mockGetState(),
  },
}));

describe('useWorkflowStore', () => {
  beforeEach(() => {
    mockUpdateWorkflow.mockClear();
    mockStartNewSession.mockClear();
    mockGetState.mockReturnValue({
      updateWorkflow: mockUpdateWorkflow,
      startNewSession: mockStartNewSession,
      analysis: '',
      outline: '',
      breakdown: '',
      chapters: [],
      targetChapterCount: 5
    });
    act(() => {
      useWorkflowStore.getState().resetWorkflow();
    });
  });

  it('should initialize with idle steps', () => {
    const state = useWorkflowStore.getState();
    expect(state.steps.compression.status).toBe('idle');
    expect(state.steps.analysis.status).toBe('idle');
    expect(state.currentStepId).toBe('compression');
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

  it('should auto-trigger analysis after compression completes', async () => {
    act(() => {
      useWorkflowStore.getState().updateStepContent('compression', 'Compression Content');
    });
    await act(async () => {
      await useWorkflowStore.getState().completeStep('compression');
    });
    const state = useWorkflowStore.getState();
    expect(state.currentStepId).toBe('analysis');
    expect(state.autoTriggerStepId).toBe('analysis');
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
    expect(state.autoTriggerStepId).toBeNull(); 
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

describe('useWorkflowStore - Automation Actions', () => {
  beforeEach(() => {
    act(() => {
      useWorkflowStore.getState().resetWorkflow();
    });
  });

  it('should set auto mode correctly', () => {
    act(() => {
      useWorkflowStore.getState().setAutoMode('full_auto');
    });
    const state = useWorkflowStore.getState();
    expect(state.autoMode).toBe('full_auto');
  });

  it('should set auto range correctly', () => {
    act(() => {
      useWorkflowStore.getState().setAutoRange(2, 4);
    });
    const state = useWorkflowStore.getState();
    expect(state.autoRangeStart).toBe(2);
    expect(state.autoRangeEnd).toBe(4);
  });

  it('should clamp auto range to target chapter count', () => {
    act(() => {
      useWorkflowStore.getState().setAutoRange(2, 10);
    });

    const state = useWorkflowStore.getState();
    expect(state.autoRangeStart).toBe(2);
    expect(state.autoRangeEnd).toBe(5);
  });

  it('should pause generation and abort active step', () => {
    act(() => {
      useWorkflowStore.getState().startStep('continuation');
    });
    
    act(() => {
      useWorkflowStore.getState().pauseGeneration();
    });
    
    const state = useWorkflowStore.getState();
    expect(state.isPaused).toBe(true);
    expect(state.isGenerating).toBe(false);
  });

  it('should resume generation', () => {
    act(() => {
      useWorkflowStore.getState().pauseGeneration();
    });
    
    act(() => {
      useWorkflowStore.getState().resumeGeneration();
    });
    
    const state = useWorkflowStore.getState();
    expect(state.isPaused).toBe(false);
    expect(state.autoTriggerStepId).toBe(state.currentStepId);
  });

  it('should reset autoMode to manual on error', () => {
    act(() => {
      useWorkflowStore.getState().setAutoMode('full_auto');
      useWorkflowStore.getState().setStepError('continuation', 'API Error');
    });
    
    const state = useWorkflowStore.getState();
    expect(state.autoTriggerStepId).toBeNull();
    expect(state.autoMode).toBe('manual');
  });

  it('should force reset generation flags', () => {
    act(() => {
      useWorkflowStore.getState().setIsGenerating(true);
      useWorkflowStore.getState().setAutoMode('full_auto');
      useWorkflowStore.getState().resumeGeneration();
      useWorkflowStore.getState().pauseGeneration();
      useWorkflowStore.getState().forceResetGeneration();
    });

    const state = useWorkflowStore.getState();
    expect(state.isGenerating).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.autoTriggerStepId).toBeNull();
  });

  it('should reset all steps state', () => {
    act(() => {
      useWorkflowStore.getState().updateStepContent('analysis', 'temp');
      useWorkflowStore.getState().setStepError('analysis', 'err');
      useWorkflowStore.getState().setCurrentStep('continuation');
      useWorkflowStore.getState().setAutoMode('full_auto');
      useWorkflowStore.getState().setIsGenerating(true);
      useWorkflowStore.getState().resetAllSteps();
    });

    const state = useWorkflowStore.getState();
    expect(state.currentStepId).toBe('compression');
    expect(state.steps.compression.status).toBe('idle');
    expect(state.steps.analysis.status).toBe('idle');
    expect(state.steps.analysis.content).toBe('');
    expect(state.autoMode).toBe('manual');
    expect(state.isGenerating).toBe(false);
    expect(state.autoTriggerStepId).toBeNull();
  });
});

describe('useWorkflowStore - Automation Logic', () => {
  beforeEach(() => {
    mockUpdateWorkflow.mockClear();
    mockGetState.mockReturnValue({
      updateWorkflow: mockUpdateWorkflow,
      startNewSession: mockStartNewSession,
      analysis: '',
      outline: '',
      breakdown: '',
      chapters: ['Chapter 1'],
      targetChapterCount: 5
    });
    act(() => {
      useWorkflowStore.getState().resetWorkflow();
      useWorkflowStore.getState().setAutoMode('full_auto');
      useWorkflowStore.getState().updateStepContent('continuation', 'Chapter 2 Content');
    });
  });

  it('should auto-trigger next chapter in full_auto mode', async () => {
    // Setup: just finished chapter 2 (so chapters will be 2)
    mockGetState.mockReturnValue({
        updateWorkflow: mockUpdateWorkflow,
        startNewSession: mockStartNewSession,
        analysis: '',
        outline: '',
        breakdown: '',
        chapters: ['Chapter 1', 'Chapter 2'],
        targetChapterCount: 5
    });

    await act(async () => {
      await useWorkflowStore.getState().completeStep('continuation');
    });

    const state = useWorkflowStore.getState();
    expect(state.autoTriggerStepId).toBe('continuation');
  });

  it('should auto-trigger next chapter in range mode if within range', async () => {
    act(() => {
      useWorkflowStore.getState().setAutoMode('range');
      useWorkflowStore.getState().setAutoRange(2, 3); // Generate up to 3
    });

    // Setup: just finished chapter 2 (so chapters will be 2). Next is 3. 3 <= 3. Trigger.
    mockGetState.mockReturnValue({
        updateWorkflow: mockUpdateWorkflow,
        startNewSession: mockStartNewSession,
        analysis: '',
        outline: '',
        breakdown: '',
        chapters: ['Chapter 1', 'Chapter 2'],
        targetChapterCount: 5
    });

    await act(async () => {
      await useWorkflowStore.getState().completeStep('continuation');
    });

    const state = useWorkflowStore.getState();
    expect(state.autoTriggerStepId).toBe('continuation');
  });

  it('should NOT auto-trigger next chapter in range mode if end reached', async () => {
    act(() => {
      useWorkflowStore.getState().setAutoMode('range');
      useWorkflowStore.getState().setAutoRange(2, 2); // Generate up to 2
    });

    // Setup: just finished chapter 2 (so chapters will be 2). Next is 3. 3 > 2. Stop.
    mockGetState.mockReturnValue({
        updateWorkflow: mockUpdateWorkflow,
        startNewSession: mockStartNewSession,
        analysis: '',
        outline: '',
        breakdown: '',
        chapters: ['Chapter 1', 'Chapter 2'],
        targetChapterCount: 5
    });

    await act(async () => {
      await useWorkflowStore.getState().completeStep('continuation');
    });

    const state = useWorkflowStore.getState();
    expect(state.autoTriggerStepId).toBeNull();
  });

  it('should NOT auto-trigger if paused', async () => {
    act(() => {
      useWorkflowStore.getState().setAutoMode('full_auto');
      useWorkflowStore.getState().pauseGeneration();
    });

    // Setup: just finished chapter 2
    mockGetState.mockReturnValue({
        updateWorkflow: mockUpdateWorkflow,
        startNewSession: mockStartNewSession,
        analysis: '',
        outline: '',
        breakdown: '',
        chapters: ['Chapter 1', 'Chapter 2'],
        targetChapterCount: 5
    });

    await act(async () => {
      await useWorkflowStore.getState().completeStep('continuation');
    });

    const state = useWorkflowStore.getState();
    expect(state.autoTriggerStepId).toBeNull();
  });

  it('should release isGenerating lock when current step output is empty', async () => {
    act(() => {
      useWorkflowStore.getState().setIsGenerating(true);
    });

    await act(async () => {
      await useWorkflowStore.getState().completeStep('analysis');
    });

    const state = useWorkflowStore.getState();
    expect(state.isGenerating).toBe(false);
  });

  it('should stop auto-trigger when target chapter count is reached', async () => {
    act(() => {
      useWorkflowStore.getState().setAutoMode('full_auto');
      useWorkflowStore.getState().updateStepContent('continuation', 'Chapter 3 Content');
    });

    mockGetState.mockReturnValue({
      updateWorkflow: mockUpdateWorkflow,
      startNewSession: mockStartNewSession,
      analysis: '',
      outline: '',
      breakdown: '',
      chapters: ['Chapter 1', 'Chapter 2', 'Chapter 3'],
      targetChapterCount: 3
    });

    await act(async () => {
      await useWorkflowStore.getState().completeStep('continuation');
    });

    const state = useWorkflowStore.getState();
    expect(state.autoTriggerStepId).toBeNull();
  });
});
