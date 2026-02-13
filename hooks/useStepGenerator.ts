import { useCallback, useEffect } from 'react';
import { useWorkflowStore, WorkflowStepId } from '@/store/useWorkflowStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useRunSchedulerStore } from '@/store/useRunSchedulerStore';
import { generateStreamByProvider } from '@/lib/nim-client';
import { injectPrompt } from '@/lib/prompt-engine';
import { DEFAULT_PROMPTS } from '@/lib/prompts';
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
import type { RunStepId } from '@/lib/run-types';
import type { NovelEntry } from '@/lib/db';

type PromptTemplateKey = keyof typeof DEFAULT_PROMPTS;
const activeAbortControllers = new Map<string, AbortController>();
const PREVIEW_CHARS = 220;

const STEP_TRANSITIONS: Record<
  Exclude<WorkflowStepId, 'continuation'>,
  { nextStep: WorkflowStepId; autoTrigger: WorkflowStepId | null; delayMs: number }
> = {
  compression: { nextStep: 'analysis', autoTrigger: 'analysis', delayMs: 1000 },
  analysis: { nextStep: 'outline', autoTrigger: null, delayMs: 1500 },
  outline: { nextStep: 'breakdown', autoTrigger: 'breakdown', delayMs: 3500 },
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

async function onStepCompleted(
  sessionId: string,
  stepId: WorkflowStepId,
  content: string
): Promise<void> {
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
        workflow.setCurrentStep(transition.nextStep);
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
      workflow.setCurrentStep(transition.nextStep);
      workflow.setAutoTriggerStep(null);
    }
    return;
  }

  await wait(1000);

  if (!isActiveSession(sessionId)) {
    return;
  }

  const latestNovelState = useNovelStore.getState();
  const latestWorkflowState = useWorkflowStore.getState();
  const currentChapterCount = latestNovelState.chapters.length;
  const safeTargetChapterCount = Math.max(2, latestNovelState.targetChapterCount ?? 5);
  const nextChapter = currentChapterCount + 1;

  let shouldAutoQueueContinuation = false;
  if (currentChapterCount < safeTargetChapterCount && !latestWorkflowState.isPaused) {
    if (latestWorkflowState.autoMode === 'full_auto') {
      shouldAutoQueueContinuation = true;
    } else if (
      latestWorkflowState.autoMode === 'range' &&
      nextChapter <= latestWorkflowState.autoRangeEnd
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
      allowWhileRunning: true,
    });
  }
  workflow.resetContinuationStep(null);
}

export function useStepGenerator() {
  const setRunExecutor = useRunSchedulerStore((state) => state.setRunExecutor);

  const executeRun = useCallback(async ({
    runId,
    sessionId,
    stepId,
    userNotes,
    signal,
    onProgress,
  }: {
    runId: string;
    sessionId: string;
    stepId: WorkflowStepId;
    userNotes?: string;
    source: 'manual' | 'auto';
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
          await onStepCompleted(sessionId, stepId, skippedMessage);
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

          const taskStatuses: Record<string, 'ok' | 'retry' | 'fallback' | 'failed'> = {};
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
            let attempt = 0;
            while (attempt < 2) {
              const startedAt = Date.now();
              attempt += 1;
              progressRows.push(`${task.statusLabel}: running (attempt ${attempt})`);
              renderProgress();
              try {
                const template = (
                  customPrompts[task.promptKey] ||
                  DEFAULT_PROMPTS[task.promptKey] ||
                  customPrompts.compression ||
                  DEFAULT_PROMPTS.compression
                );

                const prompt = injectPrompt(template, {
                  originalNovel: task.id === 'eroticPack'
                    ? eroticFocusedNovel
                    : resolvedOriginalNovel,
                  compressionOutlineTargetRange,
                  compressionChunkCount,
                  compressionSampledChunkCount: task.id === 'eroticPack'
                    ? eroticSampledChunkCount
                    : compressionSampledChunkCount,
                });

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

                const section = extractCompressionSection(output, task.labels);
                if (!section.trim()) {
                  taskStatuses[task.id] = 'fallback';
                  progressRows.push(`${task.statusLabel}: marker missing, fallback to raw output`);
                  renderProgress();
                  return output.trim();
                }

                taskDurationsMs[task.id] = Date.now() - startedAt;
                taskStatuses[task.id] = attempt > 1 ? 'retry' : 'ok';
                progressRows.push(`${task.statusLabel}: done (${taskDurationsMs[task.id]}ms)`);
                renderProgress();
                return section;
              } catch (taskError) {
                if (isCancellationError(taskError)) {
                  throw taskError;
                }
                taskDurationsMs[task.id] = Date.now() - startedAt;
                if (attempt >= 2) {
                  taskStatuses[task.id] = 'failed';
                  progressRows.push(`${task.statusLabel}: failed (${taskDurationsMs[task.id]}ms)`);
                  renderProgress();
                  throw taskError;
                }
                progressRows.push(`${task.statusLabel}: retrying`);
                renderProgress();
              }
            }
            throw new Error(`Compression task ${task.id} failed`);
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
          await onStepCompleted(sessionId, stepId, content);
        }
      } else {
        const resolvedPromptTemplateKey = resolvePromptTemplateKey(stepId, canUseCompressedContext);
        const template = (
          customPrompts[resolvedPromptTemplateKey] ||
          customPrompts[stepId] ||
          DEFAULT_PROMPTS[resolvedPromptTemplateKey] ||
          DEFAULT_PROMPTS[stepId]
        );
        if (!template) throw new Error(`No prompt template found for ${stepId}`);

        let resolvedOriginalNovel = originalNovel;
        if (canUseCompressedContext) {
          resolvedOriginalNovel = compressedContext;
        }

        const prompt = injectPrompt(template, {
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
        });

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
            enableThinking: canUseThinking,
            thinkingSupported: canUseThinking,
            thinkingBudget: modelParams.thinkingBudget,
            supportedParameters,
            maxContextTokens,
            maxCompletionTokens,
            onRetry: (attempt, maxRetries, delay) => {
              console.log(`[Generator] Retrying request ${attempt}/${maxRetries} after ${delay}ms`);
            }
          },
          signal
        );

        const throttledContentUpdate = createThrottledUpdater({
          intervalMs: 180,
          onUpdate: (next) => {
            if (isActiveSession(sessionId)) {
              useWorkflowStore.getState().updateStepContent(stepId, next);
            }
            onProgress(toProgressPreview(next));
          },
        });

        try {
          for await (const chunk of stream) {
            content += chunk;
            throttledContentUpdate.push(content);
          }
        } finally {
          throttledContentUpdate.flush();
          throttledContentUpdate.cancel();
        }

        if (isActiveSession(sessionId)) {
          const storeContent = useWorkflowStore.getState().steps[stepId].content;
          if (storeContent.length === 0 && content.length > 0) {
            useWorkflowStore.getState().updateStepContent(stepId, content);
          }
          await useWorkflowStore.getState().completeStep(stepId);
        }
        await onStepCompleted(sessionId, stepId, content);

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

  const generate = useCallback((stepId: WorkflowStepId, userNotes?: string, sessionId?: string) => {
    const resolvedSessionId = sessionId ?? useNovelStore.getState().currentSessionId;
    const runId = useRunSchedulerStore.getState().enqueueRun({
      sessionId: resolvedSessionId,
      stepId: stepId as RunStepId,
      userNotes,
      source: 'manual',
    });
    if (!runId) {
      console.warn(`[Generator] Ignored ${stepId} for ${resolvedSessionId}: session is already running or queued.`);
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
