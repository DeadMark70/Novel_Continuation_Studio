import React, { useEffect } from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStepGenerator } from '../hooks/useStepGenerator';
import { parseOutlinePhase2Content, serializeOutlinePhase2Content } from '../lib/outline-phase2';

const runSchedulerState = {
  runExecutor: null as null | ((ctx: {
    runId: string;
    sessionId: string;
    stepId: 'analysis' | 'outline' | 'chapter1' | 'continuation' | 'compression' | 'breakdown';
    source: 'manual' | 'auto';
    userNotes?: string;
    sensoryAnchors?: string;
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

const createEmptyStep = (): {
  status: 'idle' | 'streaming' | 'completed' | 'error';
  content: string;
  truncation: {
    isTruncated: boolean;
    lastFinishReason: 'unknown';
    autoResumeRoundsUsed: number;
    lastTruncatedOutlineTask: undefined;
  };
} => ({
  status: 'idle',
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
  outline: string;
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
  outline: overrides?.outline ?? 'outline output',
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
  compressionMode: 'off' as 'auto' | 'on' | 'off',
  compressionAutoThreshold: 20000,
  compressionChunkSize: 6000,
  compressionChunkOverlap: 400,
  compressionEvidenceSegments: 10,
  sensoryAnchorTemplates: [
    {
      id: 'sensory_default',
      name: 'Default Sensory Focus',
      content: 'Concrete sensory details only.',
    },
  ],
  sensoryAutoTemplateByPhase: {
    chapter1: 'sensory_default',
    continuation: 'sensory_default',
  },
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
const validatePromptSectionsMock = vi.fn(() => ({
  ok: true,
  missing: [] as string[],
}));

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
  validatePromptSections: () => validatePromptSectionsMock(),
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

function getRunExecutor() {
  if (!runSchedulerState.runExecutor) {
    throw new Error('executor not set');
  }
  return runSchedulerState.runExecutor;
}

function resolvePromptKind(prompt: string):
  | 'compressionRoleCards'
  | 'compressionStyleGuide'
  | 'compressionPlotLedger'
  | 'compressionEvidencePack'
  | 'compressionEroticPack'
  | 'breakdownMeta'
  | 'breakdownChunk'
  | 'other' {
  if (prompt.includes('角色卡抽取器')) {
    return 'compressionRoleCards';
  }
  if (prompt.includes('風格指南抽取器')) {
    return 'compressionStyleGuide';
  }
  if (prompt.includes('劇情骨架與伏筆 ledger 抽取器')) {
    return 'compressionPlotLedger';
  }
  if (prompt.includes('證據包抽取器')) {
    return 'compressionEvidencePack';
  }
  if (prompt.includes('成人元素包抽取器')) {
    return 'compressionEroticPack';
  }
  if (prompt.includes('先輸出章節總覽與升級守則')) {
    return 'breakdownMeta';
  }
  if (prompt.includes('只為指定章節範圍輸出逐章內容')) {
    return 'breakdownChunk';
  }
  return 'other';
}

const compressionTaskOutputByKind = {
  compressionRoleCards: '【角色卡】\n角色資料',
  compressionStyleGuide: '【風格指南】\n風格規則',
  compressionPlotLedger: '【壓縮大綱】\n劇情骨架',
  compressionEvidencePack: '【證據包】\n關鍵證據',
  compressionEroticPack: '【成人元素包】\n成人張力規則',
} as const;

describe('useStepGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validatePromptSectionsMock.mockReset();
    validatePromptSectionsMock.mockReturnValue({ ok: true, missing: [] as string[] });
    runSchedulerState.runExecutor = null;
    runSchedulerState.enqueueRun.mockReturnValue('queued_run_id');
    runSchedulerState.getSessionRunState.mockReturnValue(undefined);
    workflowState.autoMode = 'manual';
    workflowState.autoRangeEnd = 5;
    workflowState.isPaused = false;
    workflowState.steps.compression = createEmptyStep();
    workflowState.steps.analysis = createEmptyStep();
    workflowState.steps.outline = createEmptyStep();
    workflowState.steps.breakdown = createEmptyStep();
    workflowState.steps.chapter1 = createEmptyStep();
    workflowState.steps.continuation = createEmptyStep();
    novelState.currentSessionId = 'session_active';
    novelState.getSessionSnapshot.mockImplementation(async (sessionId: string) => createSessionSnapshot(sessionId));
    settingsState.compressionMode = 'off';
    settingsState.autoResumeOnLength = true;
    settingsState.autoResumeMaxRounds = 2;
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

  it('keeps analysis output only and does not inject format notice into content', async () => {
    novelState.currentSessionId = 'session_active';
    validatePromptSectionsMock.mockReturnValueOnce({
      ok: false,
      missing: ['角色動機地圖'],
    });
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
        yield 'analysis body content';
      }
    );

    await expect(
      getRunExecutor()({
        runId: 'run_analysis_validation_fail',
        sessionId: 'session_active',
        stepId: 'analysis',
        source: 'manual',
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      })
    ).rejects.toThrow(/格式檢查提醒/i);

    const analysisContentUpdates = (
      workflowState.updateStepContent.mock.calls as Array<[string, string]>
    ).filter(([stepId]) => stepId === 'analysis');
    expect(analysisContentUpdates.length).toBeGreaterThan(0);
    const lastAnalysisUpdate = analysisContentUpdates[analysisContentUpdates.length - 1][1];
    expect(lastAnalysisUpdate).toContain('analysis body content');
    expect(lastAnalysisUpdate).not.toContain('【格式檢查提醒】');
    expect(workflowState.setStepError).toHaveBeenCalledWith(
      'analysis',
      expect.stringContaining('【格式檢查提醒】')
    );
  });

  it('falls back to pre-run analysis content when new run has no output and validation fails', async () => {
    workflowState.steps.analysis.status = 'completed';
    workflowState.steps.analysis.content = 'previous analysis content';
    novelState.currentSessionId = 'session_active';
    validatePromptSectionsMock.mockReturnValueOnce({
      ok: false,
      missing: ['角色動機地圖'],
    });
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
        // Intentionally no chunks.
      }
    );

    await expect(
      getRunExecutor()({
        runId: 'run_analysis_validation_fail_empty_output',
        sessionId: 'session_active',
        stepId: 'analysis',
        source: 'manual',
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      })
    ).rejects.toThrow(/格式檢查提醒/i);

    const analysisContentUpdates = (
      workflowState.updateStepContent.mock.calls as Array<[string, string]>
    ).filter(([stepId]) => stepId === 'analysis');
    expect(analysisContentUpdates.length).toBeGreaterThan(0);
    const lastAnalysisUpdate = analysisContentUpdates[analysisContentUpdates.length - 1][1];
    expect(lastAnalysisUpdate).toBe('previous analysis content');
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
        sensoryAnchors: 'Concrete sensory details only.',
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

  it('preserves existing 2A content when retrying only 2B', async () => {
    const existingOutline = serializeOutlinePhase2Content({
      part2A: 'Phase 2A baseline',
      part2B: 'Phase 2B baseline',
      missing2A: [],
      missing2B: [],
    });
    workflowState.steps.outline.status = 'completed';
    workflowState.steps.outline.content = existingOutline;
    novelState.currentSessionId = 'session_active';
    novelState.getSessionSnapshot.mockImplementation(async (sessionId: string) => (
      createSessionSnapshot(sessionId, { outline: '' })
    ));

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
        yield '【權力與張力機制】\nRetry 2B tension\n\n【伏筆回收與新埋規劃】\nRetry 2B foreshadow';
      }
    );

    vi.useFakeTimers();
    try {
      const runPromise = getRunExecutor()({
        runId: 'run_outline_retry_2b',
        sessionId: 'session_active',
        stepId: 'outline',
        source: 'manual',
        userNotes: 'keep pacing\n[[OUTLINE_TASK:2B]]',
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      });
      await vi.advanceTimersByTimeAsync(3500);
      await runPromise;
    } finally {
      vi.useRealTimers();
    }

    const outlinePersistCall = (
      novelState.applyStepResultBySession.mock.calls as unknown as Array<[string, string, string]>
    ).find((call) => call[1] === 'outline');
    expect(outlinePersistCall).toBeDefined();
    const parsed = parseOutlinePhase2Content(outlinePersistCall?.[2] ?? '');
    expect(parsed.part2A).toContain('Phase 2A baseline');
    expect(parsed.part2B).toContain('Retry 2B tension');
    expect(workflowState.updateStepContent).toHaveBeenCalledWith('outline', existingOutline);
  });

  it('does not auto-resume outline phase on length truncation and keeps manual reminder path', async () => {
    settingsState.autoResumeOnLength = true;
    settingsState.autoResumePhaseOutline = true;
    novelState.currentSessionId = 'session_active';
    novelState.getSessionSnapshot.mockImplementation(async (sessionId: string) => (
      createSessionSnapshot(sessionId, { outline: '' })
    ));

    let phase2ACalls = 0;
    generateStreamByProviderMock.mockImplementation(
      async function* (
        _provider: string,
        prompt: string,
        _model: string,
        _apiKey: string,
        _systemPrompt: unknown,
        options?: { onFinish?: (meta: { finishReason: 'stop' | 'length' | 'unknown' }) => void }
      ) {
        if (prompt.includes('Phase 2A')) {
          phase2ACalls += 1;
          options?.onFinish?.({ finishReason: 'length' });
          yield '【續寫總目標與篇幅配置】\nPartial 2A';
          return;
        }
        if (prompt.includes('Phase 2B')) {
          options?.onFinish?.({ finishReason: 'stop' });
          yield '【權力與張力機制】\n2B tension\n\n【伏筆回收與新埋規劃】\n2B hooks';
          return;
        }
        options?.onFinish?.({ finishReason: 'stop' });
        yield 'Generated content';
      }
    );

    vi.useFakeTimers();
    try {
      const runPromise = getRunExecutor()({
        runId: 'run_outline_no_auto_resume',
        sessionId: 'session_active',
        stepId: 'outline',
        source: 'manual',
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      });
      await vi.advanceTimersByTimeAsync(3500);
      await runPromise;
    } finally {
      vi.useRealTimers();
    }

    expect(phase2ACalls).toBe(1);
    expect(
      generateStreamByProviderMock.mock.calls.some((call) => String(call[1]).includes('【已輸出內容（禁止重複）】'))
    ).toBe(false);
    expect(workflowState.updateStepTruncation).toHaveBeenCalledWith(
      'outline',
      expect.objectContaining({
        isTruncated: true,
        autoResumeRoundsUsed: 0,
        lastTruncatedOutlineTask: '2A',
      })
    );
  });

  it('forwards sensory anchors when manually queuing chapter generation', () => {
    act(() => {
      hookApi?.generate('chapter1', { sensoryAnchors: 'cold steel, wet cloth' }, 'session_active');
    });

    expect(runSchedulerState.enqueueRun).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session_active',
        stepId: 'chapter1',
        source: 'manual',
        sensoryAnchors: 'cold steel, wet cloth',
      })
    );
  });

  it('skips compression when mode is off and persists skipped metadata', async () => {
    settingsState.compressionMode = 'off';
    novelState.currentSessionId = 'session_active';
    novelState.getSessionSnapshot.mockImplementation(async (sessionId: string) => (
      createSessionSnapshot(sessionId, { content: 'short source' })
    ));

    vi.useFakeTimers();
    try {
      const runPromise = getRunExecutor()({
        runId: 'run_compression_skip',
        sessionId: 'session_active',
        stepId: 'compression',
        source: 'manual',
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      });
      await vi.advanceTimersByTimeAsync(1000);
      await runPromise;
    } finally {
      vi.useRealTimers();
    }

    expect(novelState.updateWorkflowBySession).toHaveBeenCalledWith(
      'session_active',
      expect.objectContaining({
        compressionMeta: expect.objectContaining({
          skipped: true,
          reason: expect.stringContaining('Compression mode is set to OFF'),
        }),
      })
    );
    expect(novelState.applyStepResultBySession).not.toHaveBeenCalled();
    expect(runSchedulerState.enqueueRun).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session_active',
        stepId: 'analysis',
        source: 'auto',
      })
    );
  });

  it('records compression task failure and marks run as error', async () => {
    settingsState.compressionMode = 'on';
    novelState.currentSessionId = 'session_active';
    novelState.getSessionSnapshot.mockImplementation(async (sessionId: string) => (
      createSessionSnapshot(sessionId, {
        content: 'A'.repeat(30000),
      })
    ));
    generateStreamByProviderMock.mockImplementation(
      async function* (
        _provider: string,
        prompt: string,
        _model: string,
        _apiKey: string,
        _systemPrompt: unknown,
        options?: { onFinish?: (meta: { finishReason: 'stop' | 'length' | 'unknown' }) => void }
      ) {
        options?.onFinish?.({ finishReason: 'stop' });
        const kind = resolvePromptKind(prompt);
        if (kind === 'compressionEvidencePack') {
          yield 'missing section heading';
          return;
        }
        if (kind in compressionTaskOutputByKind) {
          yield compressionTaskOutputByKind[kind as keyof typeof compressionTaskOutputByKind];
          return;
        }
        yield 'Generated content';
      }
    );

    await expect(
      getRunExecutor()({
        runId: 'run_compression_fail',
        sessionId: 'session_active',
        stepId: 'compression',
        source: 'manual',
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      })
    ).rejects.toThrow(/格式檢查提醒/i);

    expect(workflowState.setStepError).toHaveBeenCalled();
    expect(novelState.setSessionRunMeta).toHaveBeenCalledWith(
      'session_active',
      expect.objectContaining({
        runStatus: 'error',
        recoverableStepId: 'compression',
      })
    );
  });

  it('persists compression pipeline metadata for successful runs', async () => {
    settingsState.compressionMode = 'on';
    novelState.currentSessionId = 'session_active';
    novelState.getSessionSnapshot.mockImplementation(async (sessionId: string) => (
      createSessionSnapshot(sessionId, {
        content: 'B'.repeat(32000),
      })
    ));
    generateStreamByProviderMock.mockImplementation(
      async function* (
        _provider: string,
        prompt: string,
        _model: string,
        _apiKey: string,
        _systemPrompt: unknown,
        options?: { onFinish?: (meta: { finishReason: 'stop' | 'length' | 'unknown' }) => void }
      ) {
        options?.onFinish?.({ finishReason: 'stop' });
        const kind = resolvePromptKind(prompt);
        if (kind in compressionTaskOutputByKind) {
          yield compressionTaskOutputByKind[kind as keyof typeof compressionTaskOutputByKind];
          return;
        }
        yield 'Generated content';
      }
    );

    vi.useFakeTimers();
    try {
      const runPromise = getRunExecutor()({
        runId: 'run_compression_success',
        sessionId: 'session_active',
        stepId: 'compression',
        source: 'manual',
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      });
      await vi.advanceTimersByTimeAsync(1000);
      await runPromise;
    } finally {
      vi.useRealTimers();
    }

    const compressionCalls = novelState.updateWorkflowBySession.mock.calls as unknown as Array<[string, { compressionMeta?: { skipped?: boolean; taskStatus?: Record<string, string>; taskDurationsMs?: Record<string, number> }; compressedContext?: string }]>;
    const compressionCall = compressionCalls.find(([, payload]) => (
      Boolean(payload?.compressionMeta && payload.compressionMeta.skipped === false)
    ));
    expect(compressionCall).toBeDefined();
    const compressionPayload = compressionCall?.[1];
    expect(compressionPayload?.compressionMeta?.taskStatus).toMatchObject({
      roleCards: 'ok',
      styleGuide: 'ok',
      plotLedger: 'ok',
      evidencePack: 'ok',
      eroticPack: 'ok',
      synthesis: 'ok',
    });
    expect(compressionPayload?.compressionMeta?.taskDurationsMs).toEqual(
      expect.objectContaining({
        roleCards: expect.any(Number),
        styleGuide: expect.any(Number),
        plotLedger: expect.any(Number),
        evidencePack: expect.any(Number),
        eroticPack: expect.any(Number),
        synthesis: expect.any(Number),
      })
    );
    expect(compressionPayload?.compressedContext).toContain('【角色卡】');
    expect(compressionPayload?.compressedContext).toContain('【風格指南】');
  });

  it('surfaces breakdown chunk failure after successful meta stage', async () => {
    settingsState.compressionMode = 'off';
    novelState.currentSessionId = 'session_active';
    novelState.getSessionSnapshot.mockImplementation(async (sessionId: string) => (
      createSessionSnapshot(sessionId, {
        targetChapterCount: 4,
      })
    ));
    generateStreamByProviderMock.mockImplementation(
      async function* (
        _provider: string,
        prompt: string,
        _model: string,
        _apiKey: string,
        _systemPrompt: unknown,
        options?: { onFinish?: (meta: { finishReason: 'stop' | 'length' | 'unknown' }) => void }
      ) {
        options?.onFinish?.({ finishReason: 'stop' });
        const kind = resolvePromptKind(prompt);
        if (kind === 'breakdownMeta') {
          yield '【章節框架總覽】\n總覽\n\n【張力升級與去重守則】\n守則';
          return;
        }
        if (kind === 'breakdownChunk') {
          throw new Error('chunk failed');
        }
        yield 'Generated content';
      }
    );

    await expect(
      getRunExecutor()({
        runId: 'run_breakdown_chunk_fail',
        sessionId: 'session_active',
        stepId: 'breakdown',
        source: 'manual',
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      })
    ).rejects.toThrow(/chunk failed/i);

    expect(workflowState.setStepError).toHaveBeenCalled();
    expect(novelState.setSessionRunMeta).toHaveBeenCalledWith(
      'session_active',
      expect.objectContaining({
        runStatus: 'error',
        recoverableStepId: 'breakdown',
      })
    );
    expect(workflowState.updateStepContent).toHaveBeenCalledWith(
      'breakdown',
      expect.stringContaining('- Meta: done')
    );
    expect(workflowState.updateStepContent).toHaveBeenCalledWith(
      'breakdown',
      expect.stringContaining('Chunk 1 (1-4): error')
    );
  });

  it('does not auto-resume breakdown chunk when length finish reason is returned', async () => {
    settingsState.compressionMode = 'off';
    settingsState.autoResumeOnLength = true;
    settingsState.autoResumeMaxRounds = 2;
    novelState.currentSessionId = 'session_active';
    novelState.getSessionSnapshot.mockImplementation(async (sessionId: string) => (
      createSessionSnapshot(sessionId, {
        targetChapterCount: 4,
      })
    ));

    let chunkAttempts = 0;
    generateStreamByProviderMock.mockImplementation(
      async function* (
        _provider: string,
        prompt: string,
        _model: string,
        _apiKey: string,
        _systemPrompt: unknown,
        options?: { onFinish?: (meta: { finishReason: 'stop' | 'length' | 'unknown' }) => void }
      ) {
        const kind = resolvePromptKind(prompt);
        if (kind === 'breakdownMeta') {
          options?.onFinish?.({ finishReason: 'stop' });
          yield '【章節框架總覽】\nMeta overview\n\n【張力升級與去重守則】\nMeta rules';
          return;
        }
        if (kind === 'breakdownChunk') {
          chunkAttempts += 1;
          if (chunkAttempts === 1) {
            options?.onFinish?.({ finishReason: 'length' });
            yield '【逐章章節表】\n【第1章】第一版';
            return;
          }
          options?.onFinish?.({ finishReason: 'stop' });
          yield '\n【第2章】續寫版';
          return;
        }
        options?.onFinish?.({ finishReason: 'stop' });
        yield 'Generated content';
      }
    );

    vi.useFakeTimers();
    try {
      const runPromise = getRunExecutor()({
        runId: 'run_breakdown_resume',
        sessionId: 'session_active',
        stepId: 'breakdown',
        source: 'manual',
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      });
      await vi.advanceTimersByTimeAsync(3500);
      await runPromise;
    } finally {
      vi.useRealTimers();
    }

    expect(chunkAttempts).toBe(1);
    expect(workflowState.updateStepTruncation).toHaveBeenCalledWith(
      'breakdown',
      expect.objectContaining({
        autoResumeRoundsUsed: 0,
      })
    );
    expect(
      generateStreamByProviderMock.mock.calls.some((call) => String(call[1]).includes('【已輸出內容（禁止重複）】'))
    ).toBe(false);
  });

  it('composes final breakdown output from meta and chunk content', async () => {
    settingsState.compressionMode = 'off';
    novelState.currentSessionId = 'session_active';
    novelState.getSessionSnapshot.mockImplementation(async (sessionId: string) => (
      createSessionSnapshot(sessionId, {
        targetChapterCount: 4,
      })
    ));
    generateStreamByProviderMock.mockImplementation(
      async function* (
        _provider: string,
        prompt: string,
        _model: string,
        _apiKey: string,
        _systemPrompt: unknown,
        options?: { onFinish?: (meta: { finishReason: 'stop' | 'length' | 'unknown' }) => void }
      ) {
        options?.onFinish?.({ finishReason: 'stop' });
        const kind = resolvePromptKind(prompt);
        if (kind === 'breakdownMeta') {
          yield '【章節框架總覽】\n總覽內容\n\n【張力升級與去重守則】\n去重規則';
          return;
        }
        if (kind === 'breakdownChunk') {
          yield '【逐章章節表】\n【第1章】情節 A';
          return;
        }
        yield 'Generated content';
      }
    );

    vi.useFakeTimers();
    try {
      const runPromise = getRunExecutor()({
        runId: 'run_breakdown_compose',
        sessionId: 'session_active',
        stepId: 'breakdown',
        source: 'manual',
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      });
      await vi.advanceTimersByTimeAsync(3500);
      await runPromise;
    } finally {
      vi.useRealTimers();
    }

    const breakdownCalls = novelState.applyStepResultBySession.mock.calls as unknown as Array<[string, string, string]>;
    const breakdownCall = breakdownCalls.find((call) => call[1] === 'breakdown');
    expect(breakdownCall).toBeDefined();
    const breakdownContent = String(breakdownCall?.[2] ?? '');
    expect((breakdownContent.match(/【逐章章節表】/g) || []).length).toBe(1);
    expect(breakdownContent).toContain('【章節框架總覽】');
    expect(breakdownContent).toContain('總覽內容');
    expect(breakdownContent).toContain('【第1章】情節 A');
    expect(breakdownContent).toContain('【張力升級與去重守則】');
    expect(breakdownContent).toContain('去重規則');
  });
});
