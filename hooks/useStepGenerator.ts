import { useCallback, useEffect } from 'react';
import { useWorkflowStore, WorkflowStepId } from '@/store/useWorkflowStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useRunSchedulerStore } from '@/store/useRunSchedulerStore';
import { generateStreamByProvider } from '@/lib/nim-client';
import { injectPrompt } from '@/lib/prompt-engine';
import { DEFAULT_PROMPTS } from '@/lib/prompts';
import {
  applyPromptSectionContract,
  validatePromptSections,
} from '@/lib/prompt-section-contracts';
import {
  parseOutlinePhase2Content,
  parseOutlineTaskDirective,
  serializeOutlinePhase2Content,
  type OutlinePhase2Task,
} from '@/lib/outline-phase2';
import {
  buildBreakdownRanges,
  composeBreakdownContent,
  extractBreakdownMetaSections,
  normalizeBreakdownChunkContent,
} from '@/lib/breakdown-phase3';
import { canAttemptThinking } from '@/lib/thinking-mode';
import {
  buildCompressionSource,
  buildCompressedContext,
  buildEroticCompressionSource,
  extractCompressionSection,
  DEFAULT_COMPRESSION_PIPELINE_PARALLELISM,
  type CompressionTaskId,
  shouldRunCompression,
} from '@/lib/compression';
import { runConsistencyCheck } from '@/lib/consistency-checker';
import { createThrottledUpdater } from '@/lib/streaming-throttle';
import type { AutoContinuationPolicy, RunStepId } from '@/lib/run-types';
import type { NovelEntry } from '@/lib/db';
import type { GenerateFinishReason } from '@/lib/llm-types';
import {
  buildResumePrompt,
  hasResumeLastOutputDirective,
  stripResumeLastOutputDirective,
} from '@/lib/resume-directive';

type PromptTemplateKey = keyof typeof DEFAULT_PROMPTS;
const activeAbortControllers = new Map<string, AbortController>();
const PREVIEW_CHARS = 220;
const UNKNOWN_FINISH_REASON: GenerateFinishReason = 'unknown';
const BREAKDOWN_CHUNK_SIZE = 4;

const STEP_TRANSITIONS: Record<
  Exclude<WorkflowStepId, 'continuation'>,
  { nextStep: WorkflowStepId; autoTrigger: WorkflowStepId | null; delayMs: number }
> = {
  compression: { nextStep: 'analysis', autoTrigger: 'analysis', delayMs: 1000 },
  analysis: { nextStep: 'outline', autoTrigger: null, delayMs: 1500 },
  outline: { nextStep: 'breakdown', autoTrigger: null, delayMs: 3500 },
  breakdown: { nextStep: 'chapter1', autoTrigger: 'chapter1', delayMs: 3500 },
  chapter1: { nextStep: 'continuation', autoTrigger: null, delayMs: 2000 },
};

interface CompressionPipelineTask {
  id: Exclude<CompressionTaskId, 'synthesis'>;
  statusLabel: string;
  promptKey: PromptTemplateKey;
  labels: string[];
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCancellationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || error.message === 'Request cancelled')
  );
}

function toProgressPreview(value: string): string {
  if (!value) {
    return '';
  }
  return value.length <= PREVIEW_CHARS ? value : value.slice(-PREVIEW_CHARS);
}

function buildFormatNotice(
  promptKey: PromptTemplateKey,
  missingSections: string[]
): string {
  return [
    '【格式檢查提醒】',
    `此步驟輸出缺少必要章節：${missingSections.map((label) => `【${label}】`).join('、')}`,
    `檢查規格：${promptKey}`,
    '系統不會自動重試，請由使用者決定是否手動重試。',
  ].join('\n');
}

function resolvePromptTemplateKey(stepId: WorkflowStepId, useCompressedContext: boolean): PromptTemplateKey {
  if (stepId === 'analysis') {
    return useCompressedContext ? 'analysisCompressed' : 'analysisRaw';
  }
  if (stepId === 'outline') {
    return useCompressedContext ? 'outlineCompressed' : 'outlineRaw';
  }
  if (stepId === 'chapter1') {
    return useCompressedContext ? 'chapter1Compressed' : 'chapter1Raw';
  }
  if (stepId === 'continuation') {
    return useCompressedContext ? 'continuationCompressed' : 'continuationRaw';
  }
  return stepId;
}

function isLengthFinishReason(reason: GenerateFinishReason): boolean {
  return reason === 'length';
}

interface StreamAttemptResult {
  content: string;
  finishReason: GenerateFinishReason;
}

interface StreamAttemptWithResumeResult extends StreamAttemptResult {
  autoResumeRoundsUsed: number;
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const safeConcurrency = Math.max(1, Math.floor(concurrency));
  const results: T[] = new Array(tasks.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < tasks.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from({ length: Math.min(safeConcurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function getSessionSnapshot(sessionId: string): Promise<NovelEntry> {
  const snapshot = await useNovelStore.getState().getSessionSnapshot(sessionId);
  if (!snapshot) {
    throw new Error(`Session "${sessionId}" does not exist.`);
  }
  return snapshot;
}

function getCurrentSessionId(): string {
  return useNovelStore.getState().currentSessionId;
}

function isActiveSession(sessionId: string): boolean {
  return getCurrentSessionId() === sessionId;
}

function resolveActiveContinuationPolicy(sessionId: string): AutoContinuationPolicy | null {
  if (!isActiveSession(sessionId)) {
    return null;
  }
  const workflowState = useWorkflowStore.getState();
  return {
    mode: workflowState.autoMode,
    autoRangeEnd: workflowState.autoRangeEnd,
    isPaused: workflowState.isPaused,
  };
}

async function onStepCompleted(
  sessionId: string,
  stepId: WorkflowStepId,
  content: string,
  options?: {
    continuationPolicy?: AutoContinuationPolicy;
    persistentSensoryAnchors?: string;
  }
): Promise<void> {
  const { continuationPolicy, persistentSensoryAnchors } = options ?? {};
  const novelStore = useNovelStore.getState();
  const runScheduler = useRunSchedulerStore.getState();
  // Compression writes all artifacts via updateWorkflowBySession already.
  // Avoid a second full-session write for compressedContext here.
  if (stepId !== 'compression') {
    await novelStore.applyStepResultBySession(sessionId, stepId, content);
  }

  const trimmedContent = content.trim();
  const workflow = useWorkflowStore.getState();

  if (stepId !== 'continuation') {
    const transition = STEP_TRANSITIONS[stepId];
    if (!trimmedContent) {
      if (isActiveSession(sessionId)) {
        workflow.setCurrentStep(stepId === 'outline' ? 'outline' : transition.nextStep);
        workflow.setAutoTriggerStep(null);
      }
      return;
    }

    await wait(transition.delayMs);

    if (transition.autoTrigger) {
      await useNovelStore.getState().setSessionRunMeta(sessionId, {
        runStatus: 'queued',
        recoverableStepId: transition.autoTrigger,
        lastRunAt: Date.now(),
        lastRunError: undefined,
      });
      runScheduler.enqueueRun({
        sessionId,
        stepId: transition.autoTrigger as RunStepId,
        source: 'auto',
        allowWhileRunning: true,
      });
    }

    if (isActiveSession(sessionId)) {
      workflow.setCurrentStep(stepId === 'outline' ? 'outline' : transition.nextStep);
      workflow.setAutoTriggerStep(null);
    }
    return;
  }

  await wait(1000);

  const latestSessionSnapshot = await getSessionSnapshot(sessionId);
  const currentChapterCount = latestSessionSnapshot.chapters.length;
  const safeTargetChapterCount = Math.max(2, latestSessionSnapshot.targetChapterCount ?? 5);
  const nextChapter = currentChapterCount + 1;
  const activePolicy = resolveActiveContinuationPolicy(sessionId);
  const effectivePolicy = activePolicy ?? continuationPolicy ?? {
    mode: 'manual' as const,
    autoRangeEnd: safeTargetChapterCount,
    isPaused: false,
  };

  let shouldAutoQueueContinuation = false;
  if (currentChapterCount < safeTargetChapterCount && !effectivePolicy.isPaused) {
    if (effectivePolicy.mode === 'full_auto') {
      shouldAutoQueueContinuation = true;
    } else if (
      effectivePolicy.mode === 'range' &&
      nextChapter <= effectivePolicy.autoRangeEnd
    ) {
      shouldAutoQueueContinuation = true;
    }
  }

  if (shouldAutoQueueContinuation) {
    await useNovelStore.getState().setSessionRunMeta(sessionId, {
      runStatus: 'queued',
      recoverableStepId: 'continuation',
      lastRunAt: Date.now(),
      lastRunError: undefined,
    });
    runScheduler.enqueueRun({
      sessionId,
      stepId: 'continuation',
      source: 'auto',
      sensoryAnchors: persistentSensoryAnchors?.trim() || undefined,
      continuationPolicy: effectivePolicy,
      allowWhileRunning: true,
    });
  }
  if (isActiveSession(sessionId)) {
    workflow.resetContinuationStep(null);
  }
}

export function useStepGenerator() {
  const setRunExecutor = useRunSchedulerStore((state) => state.setRunExecutor);

  const executeRun = useCallback(async ({
    runId,
    sessionId,
    stepId,
    userNotes,
    sensoryAnchors,
    continuationPolicy,
    signal,
    onProgress,
  }: {
    runId: string;
    sessionId: string;
    stepId: WorkflowStepId;
    userNotes?: string;
    sensoryAnchors?: string;
    source: 'manual' | 'auto';
    continuationPolicy?: AutoContinuationPolicy;
    signal: AbortSignal;
    onProgress: (preview: string) => void;
  }) => {
    if (isActiveSession(sessionId)) {
      const workflow = useWorkflowStore.getState();
      workflow.setIsGenerating(true);
      workflow.startStep(stepId);
    }

    await useNovelStore.getState().setSessionRunMeta(sessionId, {
      runStatus: 'running',
      recoverableStepId: stepId,
      lastRunError: undefined,
      lastRunAt: Date.now(),
      lastRunId: runId,
    });

    let content = '';
    try {
      const settingsState = useSettingsStore.getState();
      const {
        customPrompts,
        truncationThreshold,
        dualEndBuffer,
        compressionMode,
        compressionAutoThreshold,
        compressionChunkSize,
        compressionChunkOverlap,
        compressionEvidenceSegments,
        sensoryAnchorTemplates = [],
        sensoryAutoTemplateByPhase = {},
        autoResumeOnLength,
        autoResumePhaseAnalysis,
        autoResumePhaseOutline,
        autoResumeMaxRounds,
      } = settingsState;

      const sessionSnapshot = await getSessionSnapshot(sessionId);
      const originalNovel = sessionSnapshot.content;
      const analysis = sessionSnapshot.analysis;
      const outline = sessionSnapshot.outline;
      const breakdown = sessionSnapshot.breakdown;
      const chapters = sessionSnapshot.chapters;
      const targetStoryWordCount = sessionSnapshot.targetStoryWordCount ?? 20000;
      const targetChapterCount = sessionSnapshot.targetChapterCount ?? 5;
      const pacingMode = sessionSnapshot.pacingMode ?? 'fixed';
      const plotPercent = sessionSnapshot.plotPercent ?? 60;
      const curvePlotPercentStart = sessionSnapshot.curvePlotPercentStart ?? 80;
      const curvePlotPercentEnd = sessionSnapshot.curvePlotPercentEnd ?? 40;
      const eroticSceneLimitPerChapter = sessionSnapshot.eroticSceneLimitPerChapter ?? 2;
      const characterCards = sessionSnapshot.characterCards ?? '';
      const styleGuide = sessionSnapshot.styleGuide ?? '';
      const compressionOutline = sessionSnapshot.compressionOutline ?? '';
      const evidencePack = sessionSnapshot.evidencePack ?? '';
      const eroticPack = sessionSnapshot.eroticPack ?? '';
      const compressedContext = sessionSnapshot.compressedContext ?? '';
      const manualSensoryAnchors = sensoryAnchors?.trim();
      const autoTemplateId = stepId === 'chapter1'
        ? sensoryAutoTemplateByPhase.chapter1
        : stepId === 'continuation'
          ? sensoryAutoTemplateByPhase.continuation
          : undefined;
      const autoTemplate = autoTemplateId
        ? sensoryAnchorTemplates.find((entry) => entry.id === autoTemplateId)
        : undefined;
      const resolvedSensoryAnchors = manualSensoryAnchors || autoTemplate?.content?.trim() || undefined;
      const resolvedSensoryTemplateName = manualSensoryAnchors
        ? undefined
        : autoTemplate?.name;

      let generationConfig = settingsState.getResolvedGenerationConfig(stepId);
      if (
        generationConfig.provider === 'openrouter' &&
        generationConfig.apiKey?.trim() &&
        !generationConfig.maxContextTokens &&
        !generationConfig.maxCompletionTokens
      ) {
        try {
          await settingsState.fetchProviderModels('openrouter', generationConfig.apiKey);
          generationConfig = useSettingsStore.getState().getResolvedGenerationConfig(stepId);
        } catch (metadataError) {
          console.warn('[Generator] Failed to fetch OpenRouter model metadata for token limits:', metadataError);
        }
      }

      const {
        provider: selectedProvider,
        model: selectedModel,
        apiKey,
        params: modelParams,
        capability: modelCapability,
        supportedParameters,
        maxContextTokens,
        maxCompletionTokens,
      } = generationConfig;

      if (modelCapability && !modelCapability.chatSupported) {
        throw new Error(`Model "${selectedModel}" is marked as unavailable: ${modelCapability.reason || 'Unsupported model.'}`);
      }

      const canUseThinking = canAttemptThinking(modelParams.thinkingEnabled, modelCapability);
      const sourceChars = originalNovel?.length ?? 0;
      const compressionActive = shouldRunCompression(
        compressionMode,
        sourceChars,
        compressionAutoThreshold
      );

      const canUseCompressedContext = (
        stepId !== 'compression' &&
        compressionActive &&
        Boolean(compressedContext?.trim())
      );

      if (
        stepId !== 'compression' &&
        compressionActive &&
        !compressedContext?.trim()
      ) {
        throw new Error('Phase 0 compression is required before this step. Please run Step 0 first.');
      }

      if (stepId === 'compression') {
        if (!originalNovel?.trim()) {
          throw new Error('No original novel content available for compression.');
        }

        if (!compressionActive) {
          const reason = compressionMode === 'off'
            ? 'Compression mode is set to OFF by user.'
            : `Auto mode skipped compression because source length (${sourceChars}) <= threshold (${compressionAutoThreshold}).`;

          const skippedMessage = [
            '【Compression Skipped】',
            reason,
            'Proceeding with original novel context.',
          ].join('\n');

          await useNovelStore.getState().updateWorkflowBySession(sessionId, {
            characterCards: '',
            styleGuide: '',
            compressionOutline: '',
            evidencePack: '',
            eroticPack: '',
            compressedContext: '',
            compressionMeta: {
              sourceChars,
              compressedChars: 0,
              ratio: 0,
              chunkCount: 0,
              generatedAt: Date.now(),
              skipped: true,
              reason,
            },
          });

          if (isActiveSession(sessionId)) {
            const workflow = useWorkflowStore.getState();
            workflow.updateStepContent(stepId, skippedMessage);
            await workflow.completeStep(stepId);
          }
          onProgress(toProgressPreview(skippedMessage));
          await onStepCompleted(sessionId, stepId, skippedMessage, {
            continuationPolicy,
            persistentSensoryAnchors: resolvedSensoryAnchors,
          });
          content = skippedMessage;
        } else {
          const builtSource = buildCompressionSource(originalNovel, {
            chunkSize: compressionChunkSize,
            overlap: compressionChunkOverlap,
            maxSegments: compressionEvidenceSegments,
          });
          const builtEroticSource = buildEroticCompressionSource(
            originalNovel,
            {
              chunkSize: compressionChunkSize,
              overlap: compressionChunkOverlap,
              maxSegments: compressionEvidenceSegments,
            }
          );

          const compressionChunkCount = builtSource.chunkCount;
          const compressionSampledChunkCount = builtSource.sampledChunkCount;
          const resolvedOriginalNovel = builtSource.sourceText;
          const eroticFocusedNovel = builtEroticSource.sourceText;
          const eroticSampledChunkCount = builtEroticSource.sampledChunkCount;

          let compressionOutlineTargetRange = '';
          if (sourceChars <= 70000) {
            compressionOutlineTargetRange = '5000-7000';
          } else if (sourceChars <= 85000) {
            compressionOutlineTargetRange = '7000-8500';
          } else {
            compressionOutlineTargetRange = '8500-10000';
          }

          const taskStatuses: Record<string, 'ok' | 'failed'> = {};
          const taskDurationsMs: Record<string, number> = {};
          const progressRows: string[] = [];
          const renderProgress = () => {
            const display = ['【Phase 0 Pipeline】', ...progressRows].join('\n');
            if (isActiveSession(sessionId)) {
              useWorkflowStore.getState().updateStepContent(stepId, display);
            }
            onProgress(toProgressPreview(display));
          };

          const runTask = async (
            task: CompressionPipelineTask
          ): Promise<string> => {
            const template = (
              customPrompts[task.promptKey] ||
              DEFAULT_PROMPTS[task.promptKey] ||
              customPrompts.compression ||
              DEFAULT_PROMPTS.compression
            );
            const contractedTemplate = applyPromptSectionContract(template, task.promptKey);
            const prompt = injectPrompt(contractedTemplate, {
              originalNovel: task.id === 'eroticPack'
                ? eroticFocusedNovel
                : resolvedOriginalNovel,
              compressionOutlineTargetRange,
              compressionChunkCount,
              compressionSampledChunkCount: task.id === 'eroticPack'
                ? eroticSampledChunkCount
                : compressionSampledChunkCount,
            });

            const startedAt = Date.now();
            progressRows.push(`${task.statusLabel}: running`);
            renderProgress();
            try {
              let output = '';
              const stream = generateStreamByProvider(
                selectedProvider,
                prompt,
                selectedModel,
                apiKey,
                undefined,
                {
                  maxTokens: modelParams.autoMaxTokens ? undefined : modelParams.maxTokens,
                  autoMaxTokens: modelParams.autoMaxTokens,
                  temperature: modelParams.temperature,
                  topP: modelParams.topP,
                  topK: modelParams.topK,
                  frequencyPenalty: modelParams.frequencyPenalty,
                  presencePenalty: modelParams.presencePenalty,
                  seed: modelParams.seed,
                  enableThinking: false,
                  thinkingSupported: false,
                  supportedParameters,
                  maxContextTokens,
                  maxCompletionTokens,
                  onRetry: (retryAttempt, maxRetries, delay) => {
                    console.log(`[Compression:${task.id}] Retrying request ${retryAttempt}/${maxRetries} after ${delay}ms`);
                  }
                },
                signal
              );

              for await (const chunk of stream) {
                output += chunk;
              }

              const sectionValidation = validatePromptSections(task.promptKey, output);
              if (!sectionValidation.ok) {
                const notice = buildFormatNotice(task.promptKey, sectionValidation.missing);
                progressRows.push(`${task.statusLabel}: format-invalid`);
                renderProgress();
                if (isActiveSession(sessionId)) {
                  useWorkflowStore.getState().updateStepContent(stepId, notice);
                }
                onProgress(toProgressPreview(notice));
                throw new Error(notice);
              }

              const section = extractCompressionSection(output, task.labels);
              if (!section.trim()) {
                const notice = [
                  '【格式檢查提醒】',
                  `${task.statusLabel} 輸出為空白區塊。`,
                  '系統不會自動重試，請由使用者決定是否手動重試。',
                ].join('\n');
                progressRows.push(`${task.statusLabel}: empty-output`);
                renderProgress();
                if (isActiveSession(sessionId)) {
                  useWorkflowStore.getState().updateStepContent(stepId, notice);
                }
                onProgress(toProgressPreview(notice));
                throw new Error(notice);
              }

              taskDurationsMs[task.id] = Date.now() - startedAt;
              taskStatuses[task.id] = 'ok';
              progressRows.push(`${task.statusLabel}: done (${taskDurationsMs[task.id]}ms)`);
              renderProgress();
              return section;
            } catch (taskError) {
              if (isCancellationError(taskError)) {
                throw taskError;
              }
              taskDurationsMs[task.id] = Date.now() - startedAt;
              taskStatuses[task.id] = 'failed';
              progressRows.push(`${task.statusLabel}: failed (${taskDurationsMs[task.id]}ms)`);
              renderProgress();
              throw taskError;
            }
          };

          const tasks: CompressionPipelineTask[] = [
            {
              id: 'roleCards',
              statusLabel: 'A Role Cards',
              promptKey: 'compressionRoleCards',
              labels: ['角色卡', 'Character Cards'],
            },
            {
              id: 'styleGuide',
              statusLabel: 'B Style Guide',
              promptKey: 'compressionStyleGuide',
              labels: ['風格指南', 'Style Guide'],
            },
            {
              id: 'plotLedger',
              statusLabel: 'C Plot Ledger',
              promptKey: 'compressionPlotLedger',
              labels: ['壓縮大綱', 'Compression Outline'],
            },
            {
              id: 'evidencePack',
              statusLabel: 'D Evidence Pack',
              promptKey: 'compressionEvidencePack',
              labels: ['證據包', 'Evidence Pack'],
            },
            {
              id: 'eroticPack',
              statusLabel: 'E Erotic Pack',
              promptKey: 'compressionEroticPack',
              labels: ['成人元素包', 'Erotic Pack', '情色元素包'],
            },
          ];

          const taskRunners = tasks.map((task) => async () => ({
            task,
            section: await runTask(task),
          }));

          const taskResults = await runWithConcurrency(
            taskRunners,
            DEFAULT_COMPRESSION_PIPELINE_PARALLELISM
          );

          const artifactMap = Object.fromEntries(
            taskResults.map((result) => [result.task.id, result.section])
          ) as Record<Exclude<CompressionTaskId, 'synthesis'>, string>;

          const deterministicCompressedContext = buildCompressedContext({
            characterCards: artifactMap.roleCards ?? '',
            styleGuide: artifactMap.styleGuide ?? '',
            compressionOutline: artifactMap.plotLedger ?? '',
            evidencePack: artifactMap.evidencePack ?? '',
            eroticPack: artifactMap.eroticPack ?? '',
          });

          taskStatuses.synthesis = 'ok';
          taskDurationsMs.synthesis = 0;
          progressRows.push('F Programmatic Merge: done (0ms)');
          renderProgress();

          const artifacts = {
            characterCards: artifactMap.roleCards ?? '',
            styleGuide: artifactMap.styleGuide ?? '',
            compressionOutline: artifactMap.plotLedger ?? '',
            evidencePack: artifactMap.evidencePack ?? '',
            eroticPack: artifactMap.eroticPack ?? '',
            compressedContext: deterministicCompressedContext,
          };

          const compressedChars = artifacts.compressedContext.length;
          content = artifacts.compressedContext;
          if (isActiveSession(sessionId)) {
            useWorkflowStore.getState().updateStepContent(stepId, content);
          }
          onProgress(toProgressPreview(content));

          await useNovelStore.getState().updateWorkflowBySession(sessionId, {
            ...artifacts,
            compressionMeta: {
              sourceChars,
              compressedChars,
              ratio: sourceChars > 0 ? Number((compressedChars / sourceChars).toFixed(4)) : 0,
              chunkCount: compressionChunkCount || compressionSampledChunkCount,
              generatedAt: Date.now(),
              skipped: false,
              pipelineVersion: 'v2',
              taskStatus: taskStatuses,
              taskDurationsMs,
              synthesisFallback: false,
            },
          });

          if (isActiveSession(sessionId)) {
            await useWorkflowStore.getState().completeStep(stepId);
          }
          await onStepCompleted(sessionId, stepId, content, {
            continuationPolicy,
            persistentSensoryAnchors: resolvedSensoryAnchors,
          });
        }
      } else {
        const resolvedPromptTemplateKey = resolvePromptTemplateKey(stepId, canUseCompressedContext);
        let resolvedOriginalNovel = originalNovel;
        if (canUseCompressedContext) {
          resolvedOriginalNovel = compressedContext;
        }

        const runSinglePromptAttempt = async (
          promptToRun: string,
          initialContent: string,
          onContentUpdate?: (next: string) => void
        ): Promise<StreamAttemptResult> => {
          let attemptContent = initialContent;
          let finishReason: GenerateFinishReason = UNKNOWN_FINISH_REASON;
          const stream = generateStreamByProvider(
            selectedProvider,
            promptToRun,
            selectedModel,
            apiKey,
            undefined,
            {
              maxTokens: modelParams.autoMaxTokens ? undefined : modelParams.maxTokens,
              autoMaxTokens: modelParams.autoMaxTokens,
              temperature: modelParams.temperature,
              topP: modelParams.topP,
              topK: modelParams.topK,
              frequencyPenalty: modelParams.frequencyPenalty,
              presencePenalty: modelParams.presencePenalty,
              seed: modelParams.seed,
              enableThinking: canUseThinking,
              thinkingSupported: canUseThinking,
              thinkingBudget: modelParams.thinkingBudget,
              supportedParameters,
              maxContextTokens,
              maxCompletionTokens,
              onRetry: (attempt, maxRetries, delay) => {
                console.log(`[Generator] Retrying request ${attempt}/${maxRetries} after ${delay}ms`);
              },
              onFinish: (meta) => {
                finishReason = meta.finishReason;
              },
            },
            signal
          );

          const throttledContentUpdate = createThrottledUpdater({
            intervalMs: 180,
            onUpdate: (next) => {
              if (onContentUpdate) {
                onContentUpdate(next);
                return;
              }
              if (isActiveSession(sessionId)) {
                useWorkflowStore.getState().updateStepContent(stepId, next);
              }
              onProgress(toProgressPreview(next));
            },
          });

          if (attemptContent.length > 0) {
            throttledContentUpdate.push(attemptContent);
          }

          try {
            for await (const chunk of stream) {
              attemptContent += chunk;
              throttledContentUpdate.push(attemptContent);
            }
          } finally {
            throttledContentUpdate.flush();
            throttledContentUpdate.cancel();
          }
          return { content: attemptContent, finishReason };
        };

        const streamPromptAttempt = async (
          promptToRun: string,
          onContentUpdate?: (next: string) => void,
          options?: {
            manualResume?: boolean;
            initialContent?: string;
            autoResumeEnabled?: boolean;
          }
        ): Promise<StreamAttemptWithResumeResult> => {
          const maxRounds = Math.max(1, Math.floor(autoResumeMaxRounds));
          let attemptPrompt = promptToRun;
          let accumulatedContent = options?.initialContent ?? '';
          let autoResumeRoundsUsed = 0;
          let latestFinishReason: GenerateFinishReason = UNKNOWN_FINISH_REASON;
          const shouldManualResume = Boolean(options?.manualResume && accumulatedContent.trim());

          if (shouldManualResume) {
            attemptPrompt = buildResumePrompt(promptToRun, accumulatedContent);
          }

          while (true) {
            const result = await runSinglePromptAttempt(
              attemptPrompt,
              accumulatedContent,
              onContentUpdate
            );
            accumulatedContent = result.content;
            latestFinishReason = result.finishReason;

            const canAutoResume = Boolean(
              options?.autoResumeEnabled &&
              isLengthFinishReason(latestFinishReason) &&
              autoResumeRoundsUsed < maxRounds
            );

            if (!canAutoResume) {
              break;
            }

            autoResumeRoundsUsed += 1;
            attemptPrompt = buildResumePrompt(promptToRun, accumulatedContent);
          }

          return {
            content: accumulatedContent,
            finishReason: latestFinishReason,
            autoResumeRoundsUsed,
          };
        };

        const manualResumeRequested = hasResumeLastOutputDirective(userNotes);
        const normalizedUserNotes = stripResumeLastOutputDirective(userNotes);
        const autoResumeEnabledForStep = Boolean(
          autoResumeOnLength &&
          (
            (stepId === 'analysis' && autoResumePhaseAnalysis) ||
            (stepId === 'outline' && autoResumePhaseOutline) ||
            stepId === 'breakdown'
          )
        );

        const buildPrompt = (template: string, notes?: string) => injectPrompt(
          applyPromptSectionContract(template, resolvedPromptTemplateKey),
          {
            originalNovel: resolvedOriginalNovel,
            analysis,
            outline,
            breakdown,
            previousChapters: chapters,
            userNotes: notes,
            nextChapterNumber: chapters.length + 1,
            truncationThreshold,
            dualEndBuffer,
            targetStoryWordCount,
            targetChapterCount,
            pacingMode,
            plotPercent,
            curvePlotPercentStart,
            curvePlotPercentEnd,
            eroticSceneLimitPerChapter,
            compressedContext: canUseCompressedContext ? compressedContext : '',
            characterCards,
            styleGuide,
            compressionOutline,
            evidencePack,
            eroticPack,
            sensoryAnchors: resolvedSensoryAnchors,
            sensoryTemplateName: resolvedSensoryTemplateName,
          }
        );

        if (stepId === 'outline') {
          const outlineDirective = parseOutlineTaskDirective(userNotes);
          const parsedOutline = parseOutlinePhase2Content(outline);
          const outlineState: {
            part2A: string;
            part2B: string;
            missing2A: string[];
            missing2B: string[];
          } = {
            part2A: parsedOutline.part2A,
            part2B: parsedOutline.part2B,
            missing2A: [...parsedOutline.missing2A],
            missing2B: [...parsedOutline.missing2B],
          };

          if (!parsedOutline.structured && parsedOutline.rawLegacyContent && !outlineState.part2A) {
            outlineState.part2A = parsedOutline.rawLegacyContent;
          }

          const lastTruncatedOutlineTask = isActiveSession(sessionId)
            ? useWorkflowStore.getState().steps.outline.truncation.lastTruncatedOutlineTask
            : undefined;
          const tasksToRun: OutlinePhase2Task[] = (
            outlineDirective.resumeFromLastOutput &&
            outlineDirective.target === 'both' &&
            lastTruncatedOutlineTask
          )
            ? [lastTruncatedOutlineTask]
            : outlineDirective.target === 'both'
              ? ['2A', '2B']
              : [outlineDirective.target];
          let hadOutlineLengthTruncation = false;
          let outlineAutoResumeRoundsUsed = 0;
          let outlineTruncatedTask: OutlinePhase2Task | undefined;
          let outlineFinishReason: GenerateFinishReason = UNKNOWN_FINISH_REASON;

          const runOutlineTask = async (task: OutlinePhase2Task): Promise<void> => {
            const promptKey: PromptTemplateKey = task === '2A'
              ? (canUseCompressedContext ? 'outlinePhase2ACompressed' : 'outlinePhase2ARaw')
              : (canUseCompressedContext ? 'outlinePhase2BCompressed' : 'outlinePhase2BRaw');
            const fallbackPromptKey: PromptTemplateKey = canUseCompressedContext
              ? 'outlineCompressed'
              : 'outlineRaw';
            const template = (
              customPrompts[promptKey] ||
              customPrompts[fallbackPromptKey] ||
              DEFAULT_PROMPTS[promptKey] ||
              DEFAULT_PROMPTS[fallbackPromptKey]
            );
            if (!template) {
              throw new Error(`No prompt template found for outline subtask ${task}`);
            }

            const prompt = injectPrompt(
              applyPromptSectionContract(template, promptKey),
              {
                originalNovel: resolvedOriginalNovel,
                analysis,
                outline,
                breakdown,
                previousChapters: chapters,
                userNotes: outlineDirective.userNotes,
                nextChapterNumber: chapters.length + 1,
                truncationThreshold,
                dualEndBuffer,
                targetStoryWordCount,
                targetChapterCount,
                pacingMode,
                plotPercent,
                curvePlotPercentStart,
                curvePlotPercentEnd,
                eroticSceneLimitPerChapter,
                compressedContext: canUseCompressedContext ? compressedContext : '',
                characterCards,
                styleGuide,
                compressionOutline,
                evidencePack,
                eroticPack,
              }
            );

            const resumeSeed = task === '2A' ? outlineState.part2A : outlineState.part2B;
            const shouldManualResumeTask = Boolean(
              outlineDirective.resumeFromLastOutput &&
              (
                outlineDirective.target === task ||
                (outlineDirective.target === 'both' && tasksToRun.length === 1 && tasksToRun[0] === task)
              )
            );

            const taskResult = await streamPromptAttempt(
              prompt,
              (next) => {
                const previewState = {
                  part2A: task === '2A' ? next : outlineState.part2A,
                  part2B: task === '2B' ? next : outlineState.part2B,
                  missing2A: task === '2A' ? [] : outlineState.missing2A,
                  missing2B: task === '2B' ? [] : outlineState.missing2B,
                };
                const preview = [
                  `【Phase 2 子任務 ${task} 生成中】`,
                  '',
                  serializeOutlinePhase2Content(previewState),
                ].join('\n');
                if (isActiveSession(sessionId)) {
                  useWorkflowStore.getState().updateStepContent(stepId, preview);
                }
                onProgress(toProgressPreview(preview));
              },
              {
                manualResume: shouldManualResumeTask,
                initialContent: shouldManualResumeTask ? resumeSeed : '',
                autoResumeEnabled: autoResumeEnabledForStep,
              }
            );
            const taskOutput = taskResult.content;
            if (isLengthFinishReason(taskResult.finishReason)) {
              hadOutlineLengthTruncation = true;
              outlineTruncatedTask = task;
              outlineFinishReason = 'length';
            } else if (!hadOutlineLengthTruncation) {
              outlineFinishReason = taskResult.finishReason;
            }
            outlineAutoResumeRoundsUsed = Math.max(
              outlineAutoResumeRoundsUsed,
              taskResult.autoResumeRoundsUsed
            );

            const validation = validatePromptSections(promptKey, taskOutput);
            if (task === '2A') {
              outlineState.part2A = taskOutput.trim();
              outlineState.missing2A = validation.missing;
            } else {
              outlineState.part2B = taskOutput.trim();
              outlineState.missing2B = validation.missing;
            }

            const snapshot = serializeOutlinePhase2Content(outlineState);
            if (isActiveSession(sessionId)) {
              useWorkflowStore.getState().updateStepTruncation(stepId, {
                isTruncated: hadOutlineLengthTruncation,
                lastFinishReason: outlineFinishReason,
                autoResumeRoundsUsed: outlineAutoResumeRoundsUsed,
                lastTruncatedOutlineTask: hadOutlineLengthTruncation ? outlineTruncatedTask : undefined,
              });
              useWorkflowStore.getState().updateStepContent(stepId, snapshot);
            }
            onProgress(toProgressPreview(snapshot));

            if (!validation.ok) {
              const notice = buildFormatNotice(promptKey, validation.missing);
              if (isActiveSession(sessionId)) {
                useWorkflowStore.getState().updateStepContent(
                  stepId,
                  [notice, '', snapshot].join('\n')
                );
              }
              onProgress(toProgressPreview(notice));
              throw new Error(notice);
            }
          };

          for (const task of tasksToRun) {
            await runOutlineTask(task);
          }
          content = serializeOutlinePhase2Content(outlineState);
        } else if (stepId === 'breakdown') {
          const breakdownRanges = buildBreakdownRanges(targetChapterCount, BREAKDOWN_CHUNK_SIZE);
          const chunkOutputs = new Array<string>(breakdownRanges.length).fill('');
          const chunkStates = new Array<'idle' | 'running' | 'done' | 'error'>(breakdownRanges.length).fill('idle');
          let metaState: 'idle' | 'running' | 'done' | 'error' = 'idle';
          let metaRaw = '';
          let hadBreakdownLengthTruncation = false;
          let breakdownAutoResumeRoundsUsed = 0;
          let breakdownFinishReason: GenerateFinishReason = UNKNOWN_FINISH_REASON;

          const buildBreakdownPreview = (): string => {
            const metaSections = extractBreakdownMetaSections(metaRaw);
            const synthesized = composeBreakdownContent({
              overview: metaSections.overview || (metaRaw.trim() || '(章節總覽生成中)'),
              chapterTable: chunkOutputs.filter((value) => value.trim()).join('\n\n'),
              rules: metaSections.rules,
            });
            const rows = [
              `- Meta: ${metaState}`,
              ...breakdownRanges.map((range, index) => (
                `- Chunk ${index + 1} (${range.start}-${range.end}): ${chunkStates[index]}`
              )),
            ];
            return ['【Phase 3 Breakdown Pipeline】', ...rows, '', synthesized].join('\n');
          };

          const publishBreakdownPreview = () => {
            const preview = buildBreakdownPreview();
            if (isActiveSession(sessionId)) {
              useWorkflowStore.getState().updateStepContent(stepId, preview);
            }
            onProgress(toProgressPreview(preview));
          };

          const sharedPromptContext = {
            originalNovel: resolvedOriginalNovel,
            analysis,
            outline,
            breakdown,
            previousChapters: chapters,
            userNotes,
            nextChapterNumber: chapters.length + 1,
            truncationThreshold,
            dualEndBuffer,
            targetStoryWordCount,
            targetChapterCount,
            pacingMode,
            plotPercent,
            curvePlotPercentStart,
            curvePlotPercentEnd,
            eroticSceneLimitPerChapter,
            compressedContext: canUseCompressedContext ? compressedContext : '',
            characterCards,
            styleGuide,
            compressionOutline,
            evidencePack,
            eroticPack,
          } as const;

          const metaTemplate = (
            customPrompts.breakdownMeta ||
            DEFAULT_PROMPTS.breakdownMeta ||
            customPrompts.breakdown ||
            DEFAULT_PROMPTS.breakdown
          );
          if (!metaTemplate) {
            throw new Error('No prompt template found for breakdown meta task');
          }
          const metaPrompt = injectPrompt(
            applyPromptSectionContract(metaTemplate, 'breakdownMeta'),
            sharedPromptContext
          );

          metaState = 'running';
          publishBreakdownPreview();
          try {
            const metaResult = await streamPromptAttempt(
              metaPrompt,
              (next) => {
                metaRaw = next;
                publishBreakdownPreview();
              },
              {
                autoResumeEnabled: autoResumeEnabledForStep,
              }
            );
            metaRaw = metaResult.content;
            if (isLengthFinishReason(metaResult.finishReason)) {
              hadBreakdownLengthTruncation = true;
              breakdownFinishReason = 'length';
            } else if (!hadBreakdownLengthTruncation) {
              breakdownFinishReason = metaResult.finishReason;
            }
            breakdownAutoResumeRoundsUsed = Math.max(
              breakdownAutoResumeRoundsUsed,
              metaResult.autoResumeRoundsUsed
            );
            metaState = 'done';
          } catch (metaError) {
            metaState = 'error';
            publishBreakdownPreview();
            throw metaError;
          }

          for (let index = 0; index < breakdownRanges.length; index += 1) {
            const range = breakdownRanges[index];
            const chunkTemplate = (
              customPrompts.breakdownChunk ||
              DEFAULT_PROMPTS.breakdownChunk ||
              customPrompts.breakdown ||
              DEFAULT_PROMPTS.breakdown
            );
            if (!chunkTemplate) {
              throw new Error('No prompt template found for breakdown chunk task');
            }
            const chunkPrompt = injectPrompt(
              applyPromptSectionContract(chunkTemplate, 'breakdownChunk'),
              {
                ...sharedPromptContext,
                chapterRangeStart: range.start,
                chapterRangeEnd: range.end,
              }
            );

            chunkStates[index] = 'running';
            publishBreakdownPreview();
            try {
              const chunkResult = await streamPromptAttempt(
                chunkPrompt,
                (next) => {
                  chunkOutputs[index] = normalizeBreakdownChunkContent(next);
                  publishBreakdownPreview();
                },
                {
                  autoResumeEnabled: autoResumeEnabledForStep,
                }
              );
              const chunkRaw = chunkResult.content;
              chunkOutputs[index] = normalizeBreakdownChunkContent(chunkRaw);
              if (isLengthFinishReason(chunkResult.finishReason)) {
                hadBreakdownLengthTruncation = true;
                breakdownFinishReason = 'length';
              } else if (!hadBreakdownLengthTruncation) {
                breakdownFinishReason = chunkResult.finishReason;
              }
              breakdownAutoResumeRoundsUsed = Math.max(
                breakdownAutoResumeRoundsUsed,
                chunkResult.autoResumeRoundsUsed
              );
              chunkStates[index] = 'done';
              publishBreakdownPreview();
            } catch (chunkError) {
              chunkStates[index] = 'error';
              publishBreakdownPreview();
              throw chunkError;
            }
          }

          const metaSections = extractBreakdownMetaSections(metaRaw);
          const mergedChapterTable = chunkOutputs.filter((value) => value.trim()).join('\n\n');
          content = composeBreakdownContent({
            overview: metaSections.overview || metaRaw.trim(),
            chapterTable: mergedChapterTable,
            rules: metaSections.rules,
          });
          if (isActiveSession(sessionId)) {
            useWorkflowStore.getState().updateStepTruncation(stepId, {
              isTruncated: hadBreakdownLengthTruncation,
              lastFinishReason: breakdownFinishReason,
              autoResumeRoundsUsed: breakdownAutoResumeRoundsUsed,
              lastTruncatedOutlineTask: undefined,
            });
          }
        } else {
          const template = (
            customPrompts[resolvedPromptTemplateKey] ||
            customPrompts[stepId] ||
            DEFAULT_PROMPTS[resolvedPromptTemplateKey] ||
            DEFAULT_PROMPTS[stepId]
          );
          if (!template) {
            throw new Error(`No prompt template found for ${stepId}`);
          }

          const contractedPrompt = buildPrompt(template, normalizedUserNotes);
          const shouldCheckSections = (
            resolvedPromptTemplateKey === 'analysisRaw' ||
            resolvedPromptTemplateKey === 'analysisCompressed'
          );

          const stepResult = await streamPromptAttempt(
            contractedPrompt,
            undefined,
            {
              manualResume: manualResumeRequested,
              initialContent: manualResumeRequested ? analysis : '',
              autoResumeEnabled: autoResumeEnabledForStep,
            }
          );
          content = stepResult.content;
          if (isActiveSession(sessionId) && stepId === 'analysis') {
            useWorkflowStore.getState().updateStepTruncation(stepId, {
              isTruncated: isLengthFinishReason(stepResult.finishReason),
              lastFinishReason: stepResult.finishReason,
              autoResumeRoundsUsed: stepResult.autoResumeRoundsUsed,
              lastTruncatedOutlineTask: undefined,
            });
          }
          if (shouldCheckSections) {
            const validation = validatePromptSections(resolvedPromptTemplateKey, content);
            if (!validation.ok) {
              const notice = buildFormatNotice(resolvedPromptTemplateKey, validation.missing);
              if (isActiveSession(sessionId)) {
                useWorkflowStore.getState().updateStepContent(stepId, notice);
              }
              onProgress(toProgressPreview(notice));
              throw new Error(notice);
            }
          }
        }

        if (isActiveSession(sessionId)) {
          const storeContent = useWorkflowStore.getState().steps[stepId].content;
          if (storeContent.length === 0 && content.length > 0) {
            useWorkflowStore.getState().updateStepContent(stepId, content);
          }
          await useWorkflowStore.getState().completeStep(stepId);
        }
        await onStepCompleted(sessionId, stepId, content, {
          continuationPolicy,
          persistentSensoryAnchors: resolvedSensoryAnchors,
        });

        if ((stepId === 'chapter1' || stepId === 'continuation') && isActiveSession(sessionId)) {
          const latestGeneratedChapter = content;
          const consistencyTemplate = customPrompts.consistency || DEFAULT_PROMPTS.consistency;
          const canRunLlmChecker = Boolean(apiKey?.trim());
          const consistencyConfig = settingsState.getResolvedGenerationConfig(stepId);

          void (async () => {
            try {
              const novelSnapshot = useNovelStore.getState();
              const latestChapterNumber = novelSnapshot.chapters.length;
              const latestChapterText = novelSnapshot.chapters[latestChapterNumber - 1] || latestGeneratedChapter;
              if (!latestChapterText?.trim()) {
                return;
              }

              const llmCheck = canRunLlmChecker
                ? async (checkerPrompt: string): Promise<string> => {
                  let checkerOutput = '';
                  const checkerStream = generateStreamByProvider(
                    consistencyConfig.provider,
                    checkerPrompt,
                    consistencyConfig.model,
                    consistencyConfig.apiKey,
                    undefined,
                    {
                      maxTokens: consistencyConfig.params.autoMaxTokens
                        ? undefined
                        : consistencyConfig.params.maxTokens,
                      autoMaxTokens: consistencyConfig.params.autoMaxTokens,
                      temperature: consistencyConfig.params.temperature,
                      topP: consistencyConfig.params.topP,
                      topK: consistencyConfig.params.topK,
                      frequencyPenalty: consistencyConfig.params.frequencyPenalty,
                      presencePenalty: consistencyConfig.params.presencePenalty,
                      seed: consistencyConfig.params.seed,
                      enableThinking: false,
                      thinkingSupported: false,
                      supportedParameters: consistencyConfig.supportedParameters,
                      maxContextTokens: consistencyConfig.maxContextTokens,
                      maxCompletionTokens: consistencyConfig.maxCompletionTokens,
                    }
                  );

                  for await (const checkerChunk of checkerStream) {
                    checkerOutput += checkerChunk;
                  }
                  return checkerOutput;
                }
                : undefined;

              const consistencyResult = await runConsistencyCheck({
                chapterNumber: latestChapterNumber,
                latestChapterText,
                allChapters: novelSnapshot.chapters,
                characterCards: novelSnapshot.characterCards,
                styleGuide: novelSnapshot.styleGuide,
                compressionOutline: novelSnapshot.compressionOutline,
                evidencePack: novelSnapshot.evidencePack,
                eroticPack: novelSnapshot.eroticPack,
                compressedContext: novelSnapshot.compressedContext,
                previousForeshadowLedger: novelSnapshot.foreshadowLedger,
                llmCheck,
                promptTemplate: consistencyTemplate,
              });

              await useNovelStore.getState().appendConsistencyReport(consistencyResult);
            } catch (consistencyError) {
              console.warn('[Consistency] Checker failed (non-blocking):', consistencyError);
            }
          })();
        }
      }

      const schedulerState = useRunSchedulerStore.getState().getSessionRunState(sessionId);
      if (
        schedulerState &&
        schedulerState.runId &&
        schedulerState.runId !== runId &&
        (schedulerState.status === 'queued' || schedulerState.status === 'running')
      ) {
        await useNovelStore.getState().setSessionRunMeta(sessionId, {
          runStatus: schedulerState.status,
          recoverableStepId: schedulerState.activeStepId,
          lastRunAt: Date.now(),
          lastRunError: undefined,
          lastRunId: schedulerState.runId,
        });
      } else {
        await useNovelStore.getState().setSessionRunMeta(sessionId, {
          runStatus: 'idle',
          recoverableStepId: undefined,
          lastRunAt: Date.now(),
          lastRunError: undefined,
          lastRunId: runId,
        });
      }
    } catch (error) {
      if (isCancellationError(error)) {
        if (isActiveSession(sessionId)) {
          useWorkflowStore.getState().cancelStep(stepId);
        }
        await useNovelStore.getState().setSessionRunMeta(sessionId, {
          runStatus: 'interrupted',
          recoverableStepId: stepId,
          lastRunAt: Date.now(),
          lastRunError: 'Cancelled by user.',
          lastRunId: runId,
        });
        throw error;
      }

      if (isActiveSession(sessionId)) {
        useWorkflowStore.getState().setStepError(stepId, error instanceof Error ? error.message : 'Unknown error');
      }
      await useNovelStore.getState().setSessionRunMeta(sessionId, {
        runStatus: 'error',
        recoverableStepId: stepId,
        lastRunAt: Date.now(),
        lastRunError: error instanceof Error ? error.message : 'Unknown error',
        lastRunId: runId,
      });
      throw error;
    } finally {
      if (isActiveSession(sessionId)) {
        useWorkflowStore.getState().forceResetGeneration();
      }
      if (activeAbortControllers.get(sessionId)?.signal === signal) {
        activeAbortControllers.delete(sessionId);
      }
    }
  }, []);

  useEffect(() => {
    if (useRunSchedulerStore.getState().runExecutor) {
      return;
    }
    setRunExecutor(async (ctx) => {
      const controller = new AbortController();
      activeAbortControllers.set(ctx.sessionId, controller);
      const forwardAbort = () => controller.abort();
      ctx.signal.addEventListener('abort', forwardAbort, { once: true });
      try {
        await executeRun({
          ...ctx,
          signal: controller.signal,
        });
      } finally {
        ctx.signal.removeEventListener('abort', forwardAbort);
      }
    });
  }, [executeRun, setRunExecutor]);

  const generate = useCallback((
    stepId: WorkflowStepId,
    userNotesOrOptions?: string | { userNotes?: string; sensoryAnchors?: string },
    sessionId?: string
  ) => {
    const options = typeof userNotesOrOptions === 'string' || userNotesOrOptions === undefined
      ? { userNotes: userNotesOrOptions, sensoryAnchors: undefined }
      : userNotesOrOptions;
    const resolvedSessionId = sessionId ?? useNovelStore.getState().currentSessionId;
    const continuationPolicy = stepId === 'continuation'
      ? (resolveActiveContinuationPolicy(resolvedSessionId) ?? undefined)
      : undefined;
    const runId = useRunSchedulerStore.getState().enqueueRun({
      sessionId: resolvedSessionId,
      stepId: stepId as RunStepId,
      userNotes: options.userNotes,
      sensoryAnchors: options.sensoryAnchors,
      source: 'manual',
      continuationPolicy,
    });
    if (!runId) {
      console.warn(`[Generator] Ignored ${stepId} for ${resolvedSessionId}: session is already running or queued.`);
      if (resolvedSessionId === useNovelStore.getState().currentSessionId) {
        useWorkflowStore.getState().setStepError(
          stepId,
          'Run ignored: this session already has a queued/running task. Stop current run or wait for completion.'
        );
      }
      return;
    }
    void useNovelStore.getState().setSessionRunMeta(resolvedSessionId, {
      runStatus: 'queued',
      recoverableStepId: stepId,
      lastRunAt: Date.now(),
      lastRunError: undefined,
      lastRunId: runId,
    });
  }, []);

  const stopSession = useCallback((sessionId?: string) => {
    const resolvedSessionId = sessionId ?? useNovelStore.getState().currentSessionId;
    const runState = useRunSchedulerStore.getState().getSessionRunState(resolvedSessionId);
    useRunSchedulerStore.getState().cancelSession(resolvedSessionId);
    void useNovelStore.getState().setSessionRunMeta(resolvedSessionId, {
      runStatus: 'interrupted',
      recoverableStepId: runState?.activeStepId,
      lastRunAt: Date.now(),
      lastRunError: 'Cancelled by user.',
    });
    const activeController = activeAbortControllers.get(resolvedSessionId);
    if (activeController) {
      activeController.abort();
      activeAbortControllers.delete(resolvedSessionId);
    }
  }, []);

  const stop = useCallback(() => {
    stopSession();
  }, [stopSession]);

  return { generate, stop, stopSession };
}
