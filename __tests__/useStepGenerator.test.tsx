import React, { useEffect } from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStepGenerator } from '../hooks/useStepGenerator';
import { parseOutlinePhase2Content, serializeOutlinePhase2Content } from '../lib/outline-phase2';
import { CIRCUIT_OPEN_ERROR_MESSAGE } from '../lib/circuit-breaker';

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
  autoMode: 'manual' as 'manual' | 'full_auto' | 'range',
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
  pauseGeneration: vi.fn(),
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
  autoSensoryMapping: true,
  sensoryTagUsage: {},
  autoResumeOnLength: true,
  autoResumePhaseAnalysis: true,
  autoResumePhaseOutline: true,
  autoResumeMaxRounds: 2,
  recordSensoryTagUsageBatch: vi.fn(async () => undefined),
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
  shouldEnforcePromptSections: () => true,
  appendMissingSectionsRetryInstruction: (prompt: string) => `${prompt}\n\n【格式修正重試】`,
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
  if (
    prompt.includes('只為指定章節範圍輸出逐章內容') ||
    prompt.includes('為指定章節範圍輸出逐章內容')
  ) {
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

  it('restores previous analysis content when analysis run fails', async () => {
    workflowState.steps.analysis.status = 'completed';
    workflowState.steps.analysis.content = 'stable analysis before retry';
    novelState.currentSessionId = 'session_active';
    generateStreamByProviderMock.mockImplementation(
      async function* () {
        throw new Error('analysis stream failed');
      }
    );

    await expect(
      getRunExecutor()({
        runId: 'run_analysis_fail_restore',
        sessionId: 'session_active',
        stepId: 'analysis',
        source: 'manual',
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      })
    ).rejects.toThrow(/analysis stream failed/i);

    expect(workflowState.updateStepContent).toHaveBeenCalledWith(
      'analysis',
      'stable analysis before retry'
    );
    expect(workflowState.setStepError).toHaveBeenCalledWith(
      'analysis',
      expect.stringContaining('analysis stream failed')
    );
  });

  it('pauses auto mode when circuit breaker is open', async () => {
    workflowState.autoMode = 'full_auto';
    generateStreamByProviderMock.mockImplementation(
      async function* () {
        throw new Error(`NIM: ${CIRCUIT_OPEN_ERROR_MESSAGE}`);
      }
    );

    await expect(
      getRunExecutor()({
        runId: 'run_circuit_open',
        sessionId: 'session_active',
        stepId: 'analysis',
        source: 'auto',
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      })
    ).rejects.toThrow(CIRCUIT_OPEN_ERROR_MESSAGE);

    expect(workflowState.pauseGeneration).toHaveBeenCalledTimes(1);
    expect(workflowState.setStepError).toHaveBeenCalledWith(
      'analysis',
      expect.stringContaining(CIRCUIT_OPEN_ERROR_MESSAGE)
    );
  });

  it('shows localized preflight labels before analysis stream starts', async () => {
    const onProgress = vi.fn();
    await expect(
      getRunExecutor()({
        runId: 'run_analysis_preflight_labels',
        sessionId: 'session_active',
        stepId: 'analysis',
        source: 'manual',
        signal: new AbortController().signal,
        onProgress,
      })
    ).resolves.toBeUndefined();

    const contentUpdates = (
      workflowState.updateStepContent.mock.calls as Array<[string, string]>
    ).filter(([updatedStep]) => updatedStep === 'analysis');
    expect(contentUpdates.some(([, value]) => value.includes('正在讀取原文與壓縮成果'))).toBe(true);
    expect(contentUpdates.some(([, value]) => value.includes('正在建構續寫分析提示詞'))).toBe(true);
    expect(onProgress).toHaveBeenCalledWith(expect.stringContaining('正在讀取原文與壓縮成果'));
  });

  it('retries analysis section contract once and keeps clean analysis output content', async () => {
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
    ).resolves.toBeUndefined();

    const analysisContentUpdates = (
      workflowState.updateStepContent.mock.calls as Array<[string, string]>
    ).filter(([stepId]) => stepId === 'analysis');
    expect(analysisContentUpdates.length).toBeGreaterThan(0);
    const lastAnalysisUpdate = analysisContentUpdates[analysisContentUpdates.length - 1][1];
    expect(lastAnalysisUpdate).toContain('analysis body content');
    expect(lastAnalysisUpdate).not.toContain('【格式檢查提醒】');
    expect(workflowState.setStepError).not.toHaveBeenCalled();
  });

  it('falls back to pre-run analysis content when retried analysis output is still empty', async () => {
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
    ).resolves.toBeUndefined();

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

  it('auto-resumes outline phase on length truncation when settings enable outline auto-resume', async () => {
    settingsState.autoResumeOnLength = true;
    settingsState.autoResumePhaseOutline = true;
    settingsState.autoResumeMaxRounds = 2;
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
        if (prompt.includes('生成 Phase 2A（續寫總目標與情節藍圖）')) {
          phase2ACalls += 1;
          if (phase2ACalls === 1) {
            options?.onFinish?.({ finishReason: 'length' });
            yield '【續寫總目標與篇幅配置】\nPartial 2A target\n\n【三至四段情節藍圖】\nPartial 2A blueprint';
            return;
          }
          options?.onFinish?.({ finishReason: 'stop' });
          yield '【續寫總目標與篇幅配置】\nFinal 2A target\n\n【三至四段情節藍圖】\nFinal 2A blueprint';
          return;
        }
        if (prompt.includes('生成 Phase 2B（張力機制與伏筆規劃）')) {
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

    expect(phase2ACalls).toBe(2);
    expect(
      generateStreamByProviderMock.mock.calls.some((call) => String(call[1]).includes('【已輸出內容（禁止重複）】'))
    ).toBe(true);
    expect(workflowState.updateStepTruncation).toHaveBeenCalledWith(
      'outline',
      expect.objectContaining({
        isTruncated: false,
        autoResumeRoundsUsed: 1,
        lastTruncatedOutlineTask: undefined,
      })
    );
  });

  it('auto-resumes chapter generation once on length and trims duplicated overlap', async () => {
    novelState.currentSessionId = 'session_active';
    novelState.getSessionSnapshot.mockImplementation(async (sessionId: string) => (
      createSessionSnapshot(sessionId, { chapters: [] })
    ));

    let chapterCalls = 0;
    generateStreamByProviderMock.mockImplementation(
      async function* (
        _provider: string,
        prompt: string,
        _model: string,
        _apiKey: string,
        _systemPrompt: unknown,
        options?: { onFinish?: (meta: { finishReason: 'stop' | 'length' | 'unknown' }) => void }
      ) {
        if (prompt.includes('【已輸出內容（禁止重複）】')) {
          options?.onFinish?.({ finishReason: 'stop' });
          yield '指尖發顫。然後又慢慢放下。';
          return;
        }
        if (prompt.includes('撰寫續寫的第一章')) {
          chapterCalls += 1;
          options?.onFinish?.({ finishReason: 'length' });
          yield '她抬手，指尖發顫。';
          return;
        }
        options?.onFinish?.({ finishReason: 'stop' });
        yield 'Generated content';
      }
    );

    await getRunExecutor()({
      runId: 'run_chapter1_auto_resume',
      sessionId: 'session_active',
      stepId: 'chapter1',
      source: 'manual',
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    });

    expect(chapterCalls).toBe(1);
    expect(
      generateStreamByProviderMock.mock.calls.some((call) =>
        String(call[1]).includes('【銜接前綴（僅供接續，不得重複輸出）】')
      )
    ).toBe(true);
    expect(
      generateStreamByProviderMock.mock.calls.some((call) =>
        Boolean((call[5] as { autoMaxTokens?: boolean })?.autoMaxTokens)
      )
    ).toBe(true);
    expect(novelState.applyStepResultBySession).toHaveBeenCalledWith(
      'session_active',
      'chapter1',
      '她抬手，指尖發顫。然後又慢慢放下。'
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
    workflowState.steps.breakdown.status = 'completed';
    workflowState.steps.breakdown.content = 'stable breakdown before retry';
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
    const breakdownContentUpdates = (
      workflowState.updateStepContent.mock.calls as Array<[string, string]>
    ).filter(([stepId]) => stepId === 'breakdown');
    const lastBreakdownContent = breakdownContentUpdates[breakdownContentUpdates.length - 1]?.[1];
    expect(lastBreakdownContent).toBe('stable breakdown before retry');
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
            yield [
              '【逐章章節表】',
              '【第1章】第一版',
              '【推薦感官標籤】摩擦刺激',
              '【感官視角重心】通用',
              '【第2章】第二版',
              '【推薦感官標籤】溫度刺激',
              '【感官視角重心】通用',
              '【第3章】第三版',
              '【推薦感官標籤】壓迫束縛',
              '【感官視角重心】通用',
              '【第4章】第四版',
              '【推薦感官標籤】失控反應',
              '【感官視角重心】通用',
            ].join('\n');
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
          yield [
            '【逐章章節表】',
            '【第1章】情節 A',
            '【推薦感官標籤】摩擦刺激',
            '【感官視角重心】通用',
            '【第2章】情節 B',
            '【推薦感官標籤】溫度刺激',
            '【感官視角重心】通用',
            '【第3章】情節 C',
            '【推薦感官標籤】壓迫束縛',
            '【感官視角重心】通用',
            '【第4章】情節 D',
            '【推薦感官標籤】失控反應',
            '【感官視角重心】通用',
          ].join('\n');
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
    expect(breakdownContent).toContain('【第1章】');
    expect(breakdownContent).toContain('情節 A');
    expect(breakdownContent).toContain('【張力升級與去重守則】');
    expect(breakdownContent).toContain('去重規則');
  });

  it('retries breakdown once when validator detects missing chapter count', async () => {
    settingsState.compressionMode = 'off';
    novelState.currentSessionId = 'session_active';
    novelState.getSessionSnapshot.mockImplementation(async (sessionId: string) => (
      createSessionSnapshot(sessionId, {
        targetChapterCount: 4,
      })
    ));

    let chunkCalls = 0;
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
          chunkCalls += 1;
          if (chunkCalls === 1) {
            yield [
              '【逐章章節表】',
              '【第1章】情節 A',
              '【推薦感官標籤】摩擦刺激',
              '【感官視角重心】通用',
              '【第2章】情節 B',
              '【推薦感官標籤】溫度刺激',
              '【感官視角重心】通用',
              '【第3章】情節 C',
              '【推薦感官標籤】壓迫束縛',
              '【感官視角重心】通用',
            ].join('\n');
            return;
          }
          yield [
            '【逐章章節表】',
            '【第1章】情節 A',
            '【推薦感官標籤】摩擦刺激',
            '【感官視角重心】通用',
            '【第2章】情節 B',
            '【推薦感官標籤】溫度刺激',
            '【感官視角重心】通用',
            '【第3章】情節 C',
            '【推薦感官標籤】壓迫束縛',
            '【感官視角重心】通用',
            '【第4章】情節 D',
            '【推薦感官標籤】失控反應',
            '【感官視角重心】通用',
          ].join('\n');
          return;
        }
        yield 'Generated content';
      }
    );

    vi.useFakeTimers();
    try {
      const runPromise = getRunExecutor()({
        runId: 'run_breakdown_retry_validator',
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

    expect(chunkCalls).toBe(2);
    expect(novelState.updateWorkflowBySession).toHaveBeenCalledWith(
      'session_active',
      expect.objectContaining({
        breakdownMeta: expect.objectContaining({
          repairStatus: expect.any(String),
        }),
      })
    );
  });
});
