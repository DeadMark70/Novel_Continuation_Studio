import React, { useEffect } from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStepGenerator } from '../hooks/useStepGenerator';

const runSchedulerState = {
  runExecutor: null as null | ((ctx: {
    runId: string;
    sessionId: string;
    stepId: 'analysis' | 'continuation';
    source: 'manual' | 'auto';
    userNotes?: string;
    continuationPolicy?: { mode: 'manual' | 'full_auto' | 'range'; autoRangeEnd: number; isPaused: boolean };
    signal: AbortSignal;
    onProgress: (preview: string) => void;
  }) => Promise<void>),
  setRunExecutor: vi.fn((executor: (ctx: unknown) => Promise<void>) => {
    runSchedulerState.runExecutor = executor as typeof runSchedulerState.runExecutor;
  }),
  enqueueRun: vi.fn<() => string | null>(() => 'queued_run_id'),
  cancelSession: vi.fn(),
  getSessionRunState: vi.fn(() => undefined),
};

const createEmptyStep = () => ({
  status: 'idle' as const,
  content: '',
  truncation: {
    isTruncated: false,
    lastFinishReason: 'unknown' as const,
    autoResumeRoundsUsed: 0,
    lastTruncatedOutlineTask: undefined,
  },
});

const workflowState = {
  autoMode: 'manual' as const,
  autoRangeEnd: 5,
  isPaused: false,
  setIsGenerating: vi.fn(),
  startStep: vi.fn(),
  setStepError: vi.fn(),
  forceResetGeneration: vi.fn(),
  cancelStep: vi.fn(),
  completeStep: vi.fn(async () => undefined),
  updateStepContent: vi.fn(),
  updateStepTruncation: vi.fn(),
  setCurrentStep: vi.fn(),
  setAutoTriggerStep: vi.fn(),
  resetContinuationStep: vi.fn(),
  steps: {
    compression: createEmptyStep(),
    analysis: createEmptyStep(),
    outline: createEmptyStep(),
    breakdown: createEmptyStep(),
    chapter1: createEmptyStep(),
    continuation: createEmptyStep(),
  },
};

const createSessionSnapshot = (sessionId: string, overrides?: Partial<{
  content: string;
  chapters: string[];
  targetChapterCount: number;
  runStatus: 'idle' | 'queued' | 'running' | 'interrupted' | 'error';
}>) => ({
  sessionId,
  sessionName: 'Test Session',
  content: overrides?.content ?? 'Original novel content',
  wordCount: 128,
  currentStep: 1,
  analysis: 'analysis output',
  outline: 'outline output',
  outlineDirection: '',
  breakdown: 'breakdown output',
  chapters: overrides?.chapters ?? ['Chapter 1'],
  targetStoryWordCount: 20000,
  targetChapterCount: overrides?.targetChapterCount ?? 5,
  pacingMode: 'fixed' as const,
  plotPercent: 60,
  curvePlotPercentStart: 80,
  curvePlotPercentEnd: 40,
  eroticSceneLimitPerChapter: 2,
  characterCards: '',
  styleGuide: '',
  compressionOutline: '',
  evidencePack: '',
  eroticPack: '',
  compressedContext: '',
  consistencyReports: [],
  characterTimeline: [],
  foreshadowLedger: [],
  runStatus: overrides?.runStatus ?? 'idle',
  recoverableStepId: undefined,
  lastRunAt: Date.now(),
  lastRunError: undefined,
  lastRunId: undefined,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const novelState = {
  currentSessionId: 'session_active',
  setSessionRunMeta: vi.fn(async () => undefined),
  getSessionSnapshot: vi.fn(async (sessionId: string) => createSessionSnapshot(sessionId)),
  applyStepResultBySession: vi.fn(async () => undefined),
  updateWorkflowBySession: vi.fn(async () => undefined),
  appendConsistencyReport: vi.fn(async () => undefined),
};

const settingsState = {
  customPrompts: {},
  truncationThreshold: 799,
  dualEndBuffer: 500,
  compressionMode: 'off' as const,
  compressionAutoThreshold: 20000,
  compressionChunkSize: 6000,
  compressionChunkOverlap: 400,
  compressionEvidenceSegments: 10,
  autoResumeOnLength: true,
  autoResumePhaseAnalysis: true,
  autoResumePhaseOutline: true,
  autoResumeMaxRounds: 2,
  fetchProviderModels: vi.fn(async () => []),
  getResolvedGenerationConfig: vi.fn(() => ({
    provider: 'nim' as const,
    model: 'mock-model',
    apiKey: 'mock-key',
    params: {
      maxTokens: 512,
      autoMaxTokens: false,
      temperature: 0.7,
      topP: 1,
      thinkingEnabled: false,
    },
    capability: {
      chatSupported: true,
      thinkingSupported: 'unknown' as const,
      checkedAt: Date.now(),
      source: 'probe' as const,
    },
    supportedParameters: [],
    maxContextTokens: undefined,
    maxCompletionTokens: undefined,
  })),
};

const generateStreamByProviderMock = vi.fn();

vi.mock('../store/useRunSchedulerStore', () => {
  const useRunSchedulerStore = ((selector?: (state: typeof runSchedulerState) => unknown) => {
    return selector ? selector(runSchedulerState) : runSchedulerState;
  }) as typeof runSchedulerState & ((selector?: (state: typeof runSchedulerState) => unknown) => unknown);
  (useRunSchedulerStore as unknown as { getState: () => typeof runSchedulerState }).getState = () => runSchedulerState;
  return { useRunSchedulerStore };
});

vi.mock('../store/useWorkflowStore', () => {
  const useWorkflowStore = ((selector?: (state: typeof workflowState) => unknown) => {
    return selector ? selector(workflowState) : workflowState;
  }) as typeof workflowState & ((selector?: (state: typeof workflowState) => unknown) => unknown);
  (useWorkflowStore as unknown as { getState: () => typeof workflowState }).getState = () => workflowState;
  return { useWorkflowStore };
});

vi.mock('../store/useNovelStore', () => {
  const useNovelStore = ((selector?: (state: typeof novelState) => unknown) => {
    return selector ? selector(novelState) : novelState;
  }) as typeof novelState & ((selector?: (state: typeof novelState) => unknown) => unknown);
  (useNovelStore as unknown as { getState: () => typeof novelState }).getState = () => novelState;
  return { useNovelStore };
});

vi.mock('../store/useSettingsStore', () => {
  const useSettingsStore = ((selector?: (state: typeof settingsState) => unknown) => {
    return selector ? selector(settingsState) : settingsState;
  }) as typeof settingsState & ((selector?: (state: typeof settingsState) => unknown) => unknown);
  (useSettingsStore as unknown as { getState: () => typeof settingsState }).getState = () => settingsState;
  return { useSettingsStore };
});

vi.mock('../lib/nim-client', () => ({
  generateStreamByProvider: (...args: unknown[]) => generateStreamByProviderMock(...args),
}));

vi.mock('../lib/prompt-engine', () => ({
  injectPrompt: (template: string) => template,
}));

vi.mock('../lib/prompt-section-contracts', () => ({
  applyPromptSectionContract: (template: string) => template,
  validatePromptSections: () => ({ ok: true, missing: [] as string[] }),
}));

vi.mock('../lib/consistency-checker', () => ({
  runConsistencyCheck: vi.fn(async () => ({
    report: {
      id: 'consistency_1',
      chapterNumber: 1,
      generatedAt: Date.now(),
      summary: 'ok',
      issues: [],
      regenPromptDraft: '',
    },
    characterTimelineUpdates: [],
    foreshadowLedger: [],
    summary: {
      latestChapter: 1,
      totalIssues: 0,
      highRiskCount: 0,
      openForeshadowCount: 0,
      lastCheckedAt: Date.now(),
    },
  })),
}));

let hookApi: ReturnType<typeof useStepGenerator> | null = null;

function Harness() {
  const api = useStepGenerator();
  useEffect(() => {
    hookApi = api;
    return () => {
      hookApi = null;
    };
  }, [api]);
  return null;
}

describe('useStepGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runSchedulerState.runExecutor = null;
    runSchedulerState.enqueueRun.mockReturnValue('queued_run_id');
    runSchedulerState.getSessionRunState.mockReturnValue(undefined);
    workflowState.autoMode = 'manual';
    workflowState.autoRangeEnd = 5;
    workflowState.isPaused = false;
    workflowState.steps.analysis = createEmptyStep();
    workflowState.steps.continuation = createEmptyStep();
    novelState.currentSessionId = 'session_active';
    novelState.getSessionSnapshot.mockImplementation(async (sessionId: string) => createSessionSnapshot(sessionId));
    generateStreamByProviderMock.mockImplementation(
      async function* (
        _provider: string,
        _prompt: string,
        _model: string,
        _apiKey: string,
        _systemPrompt: unknown,
        options?: { onFinish?: (meta: { finishReason: 'stop' | 'length' | 'unknown' }) => void }
      ) {
        options?.onFinish?.({ finishReason: 'stop' });
        yield 'Generated content';
      }
    );
    render(<Harness />);
  });

  it('records error metadata and workflow error state when session snapshot is missing', async () => {
    novelState.currentSessionId = 'session_active';
    novelState.getSessionSnapshot.mockImplementation(async () => undefined as never);

    const controller = new AbortController();
    await expect(
      runSchedulerState.runExecutor?.({
        runId: 'run_error_1',
        sessionId: 'session_active',
        stepId: 'analysis',
        source: 'manual',
        signal: controller.signal,
        onProgress: vi.fn(),
      }) ?? Promise.reject(new Error('executor not set'))
    ).rejects.toThrow(/does not exist/i);

    expect(workflowState.startStep).toHaveBeenCalledWith('analysis');
    expect(workflowState.setStepError).toHaveBeenCalled();
    expect(workflowState.forceResetGeneration).toHaveBeenCalled();
    expect(novelState.setSessionRunMeta).toHaveBeenCalledWith(
      'session_active',
      expect.objectContaining({
        runStatus: 'error',
        recoverableStepId: 'analysis',
      })
    );
  });

  it('queues next continuation run when continuation is full-auto and target chapters not reached', async () => {
    vi.useFakeTimers();
    novelState.currentSessionId = 'other_active_session';
    novelState.getSessionSnapshot.mockImplementation(async (sessionId: string) =>
      createSessionSnapshot(sessionId, {
        chapters: ['Chapter 1'],
        targetChapterCount: 4,
      })
    );

    const controller = new AbortController();
    const runPromise = runSchedulerState.runExecutor?.({
      runId: 'run_cont_1',
      sessionId: 'session_auto',
      stepId: 'continuation',
      source: 'auto',
      continuationPolicy: {
        mode: 'full_auto',
        autoRangeEnd: 4,
        isPaused: false,
      },
      signal: controller.signal,
      onProgress: vi.fn(),
    }) ?? Promise.reject(new Error('executor not set'));

    await vi.advanceTimersByTimeAsync(1000);
    await runPromise;

    expect(runSchedulerState.enqueueRun).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session_auto',
        stepId: 'continuation',
        source: 'auto',
        allowWhileRunning: true,
      })
    );
    expect(novelState.setSessionRunMeta).toHaveBeenCalledWith(
      'session_auto',
      expect.objectContaining({
        runStatus: 'queued',
        recoverableStepId: 'continuation',
      })
    );
    vi.useRealTimers();
  });

  it('does not write queued metadata when scheduler rejects duplicate manual generate', () => {
    runSchedulerState.enqueueRun.mockReturnValueOnce(null);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    act(() => {
      hookApi?.generate('analysis', undefined, 'session_active');
    });

    expect(runSchedulerState.enqueueRun).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session_active',
        stepId: 'analysis',
        source: 'manual',
      })
    );
    expect(novelState.setSessionRunMeta).not.toHaveBeenCalledWith(
      'session_active',
      expect.objectContaining({ runStatus: 'queued' })
    );
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
