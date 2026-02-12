import { useRef, useCallback } from 'react';
import { useWorkflowStore, WorkflowStepId } from '@/store/useWorkflowStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNovelStore } from '@/store/useNovelStore';
import { generateStreamByProvider } from '@/lib/nim-client';
import { injectPrompt } from '@/lib/prompt-engine';
import { DEFAULT_PROMPTS } from '@/lib/prompts';
import { canAttemptThinking } from '@/lib/thinking-mode';
import {
  buildCompressionSource,
  buildCompressedContext,
  extractCompressionSection,
  DEFAULT_COMPRESSION_PIPELINE_PARALLELISM,
  type CompressionTaskId,
  shouldRunCompression,
} from '@/lib/compression';
import { runConsistencyCheck } from '@/lib/consistency-checker';

type PromptTemplateKey = keyof typeof DEFAULT_PROMPTS;

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

interface CompressionPipelineTask {
  id: Exclude<CompressionTaskId, 'synthesis'>;
  statusLabel: string;
  promptKey: PromptTemplateKey;
  labels: string[];
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

export function useStepGenerator() {
  const { startStep, updateStepContent, completeStep, setStepError, cancelStep, forceResetGeneration } = useWorkflowStore();
  
  const abortControllerRef = useRef<AbortController | null>(null);
  // ✅ Removed local isGeneratingRef - now using global state from Zustand

  const generate = useCallback(async (stepId: WorkflowStepId, userNotes?: string) => {
    // ✅ Use global Zustand state for mutex lock
    const { isGenerating } = useWorkflowStore.getState();
    if (isGenerating) {
      console.warn(`[Generator] Blocked: Generation already in progress. Cannot start ${stepId}`);
      return;
    }
    useWorkflowStore.getState().setIsGenerating(true);

    // 1. Setup
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    startStep(stepId);
    let content = '';

    try {
      // 2. Prepare Context & Prompt
      // Get fresh state directly from stores to avoid stale closures during automation
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
      const {
        originalNovel,
        analysis,
        outline,
        breakdown,
        chapters,
        targetStoryWordCount,
        targetChapterCount,
        pacingMode,
        plotPercent,
        curvePlotPercentStart,
        curvePlotPercentEnd,
        eroticSceneLimitPerChapter,
        characterCards,
        styleGuide,
        compressionOutline,
        evidencePack,
        compressedContext,
      } = useNovelStore.getState();

      const generationConfig = settingsState.getResolvedGenerationConfig(stepId);
      const {
        provider: selectedProvider,
        model: selectedModel,
        apiKey,
        params: modelParams,
        capability: modelCapability,
        supportedParameters,
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

      console.log(`[Generator] Generating ${stepId}. Reading from NovelStore:`);
      console.log(`  - Analysis length: ${analysis?.length || 0}`);
      console.log(`  - Outline length: ${outline?.length || 0}`);
      console.log(`  - Breakdown length: ${breakdown?.length || 0}`);
      console.log(`  - Chapters count: ${chapters?.length || 0}`);
      // alert(`[DEBUG] Generating ${stepId}. Outline Length: ${outline?.length}`);

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

          await useNovelStore.getState().updateWorkflow({
            characterCards: '',
            styleGuide: '',
            compressionOutline: '',
            evidencePack: '',
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

          updateStepContent(stepId, skippedMessage);
          await completeStep(stepId);
          return;
        }
        const builtSource = buildCompressionSource(originalNovel, {
          chunkSize: compressionChunkSize,
          overlap: compressionChunkOverlap,
          maxSegments: compressionEvidenceSegments,
        });
        const compressionChunkCount = builtSource.chunkCount;
        const compressionSampledChunkCount = builtSource.sampledChunkCount;
        const resolvedOriginalNovel = builtSource.sourceText;
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
          updateStepContent(stepId, ['【Phase 0 Pipeline】', ...progressRows].join('\n'));
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
                originalNovel: resolvedOriginalNovel,
                compressionOutlineTargetRange,
                compressionChunkCount,
                compressionSampledChunkCount,
              });

              let output = '';
              const stream = generateStreamByProvider(
                selectedProvider,
                prompt,
                selectedModel,
                apiKey,
                undefined,
                {
                  maxTokens: modelParams.maxTokens,
                  temperature: modelParams.temperature,
                  topP: modelParams.topP,
                  topK: modelParams.topK,
                  frequencyPenalty: modelParams.frequencyPenalty,
                  presencePenalty: modelParams.presencePenalty,
                  seed: modelParams.seed,
                  // Phase 0 tasks favor stability over deep reasoning. Disable thinking kwargs
                  // to avoid model-specific template incompatibilities (e.g. Mistral tokenizer errors).
                  enableThinking: false,
                  thinkingSupported: false,
                  supportedParameters,
                  onRetry: (retryAttempt, maxRetries, delay) => {
                    console.log(`[Compression:${task.id}] Retrying request ${retryAttempt}/${maxRetries} after ${delay}ms`);
                  }
                },
                abortControllerRef.current?.signal
              );

              for await (const chunk of stream) {
                output += chunk;
              }

              const section = extractCompressionSection(output, task.labels);
              if (!section.trim()) {
                // Fall back to raw output when marker extraction fails.
                // This keeps pipeline moving and avoids hard-fail on minor format drift.
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
              if (
                taskError instanceof Error &&
                (taskError.name === 'AbortError' || taskError.message === 'Request cancelled')
              ) {
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
        });

        taskStatuses.synthesis = 'ok';
        taskDurationsMs.synthesis = 0;
        progressRows.push('E Programmatic Merge: done (0ms)');
        renderProgress();

        const artifacts = {
          characterCards: artifactMap.roleCards ?? '',
          styleGuide: artifactMap.styleGuide ?? '',
          compressionOutline: artifactMap.plotLedger ?? '',
          evidencePack: artifactMap.evidencePack ?? '',
          compressedContext: deterministicCompressedContext,
        };
        const compressedChars = artifacts.compressedContext.length;
        content = artifacts.compressedContext;
        updateStepContent(stepId, content);
        await useNovelStore.getState().updateWorkflow({
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

        await completeStep(stepId);
        return;
      }

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
      });

      // 3. Stream
      const stream = generateStreamByProvider(
        selectedProvider,
        prompt, 
        selectedModel, 
        apiKey, 
        undefined, 
        {
          maxTokens: modelParams.maxTokens,
          temperature: modelParams.temperature,
          topP: modelParams.topP,
          topK: modelParams.topK,
          frequencyPenalty: modelParams.frequencyPenalty,
          presencePenalty: modelParams.presencePenalty,
          seed: modelParams.seed,
          enableThinking: canUseThinking,
          thinkingSupported: canUseThinking,
          supportedParameters,
          onRetry: (attempt, maxRetries, delay) => {
            console.log(`[Generator] Retrying request ${attempt}/${maxRetries} after ${delay}ms`);
          }
        }, 
        abortControllerRef.current.signal
      );

      let chunkCount = 0;
      
      for await (const chunk of stream) {
        chunkCount++;
        content += chunk;
        updateStepContent(stepId, content);
        
        // Log every 10th chunk to avoid flooding console
        if (chunkCount % 10 === 0) {
          console.log(`[Generator] ${stepId}: Received ${chunkCount} chunks, total length: ${content.length}`);
        }
      }

      console.log(`[Generator] Streaming finished for ${stepId}. Total chunks: ${chunkCount}, Final content length: ${content.length}`);
      
      // Verify store has the content before completing
      const storeContent = useWorkflowStore.getState().steps[stepId].content;
      console.log(`[Generator] Store verification for ${stepId}: store length=${storeContent.length}, local length=${content.length}`);
      
      if (storeContent.length === 0 && content.length > 0) {
        console.error(`[Generator] BUG DETECTED: Store content is empty but local content has ${content.length} chars. Force updating...`);
        updateStepContent(stepId, content);
        // Wait for state to propagate
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await completeStep(stepId);

      if (stepId === 'chapter1' || stepId === 'continuation') {
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
                    maxTokens: consistencyConfig.params.maxTokens,
                    temperature: consistencyConfig.params.temperature,
                    topP: consistencyConfig.params.topP,
                    topK: consistencyConfig.params.topK,
                    frequencyPenalty: consistencyConfig.params.frequencyPenalty,
                    presencePenalty: consistencyConfig.params.presencePenalty,
                    seed: consistencyConfig.params.seed,
                    enableThinking: false,
                    thinkingSupported: false,
                    supportedParameters: consistencyConfig.supportedParameters,
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
              compressedContext: novelSnapshot.compressedContext,
              previousForeshadowLedger: novelSnapshot.foreshadowLedger,
              llmCheck,
              promptTemplate: consistencyTemplate,
            });

            await useNovelStore.getState().appendConsistencyReport(consistencyResult);
            console.log(
              `[Consistency] Chapter ${latestChapterNumber} checked. Issues: ${consistencyResult.summary.totalIssues}`
            );
          } catch (consistencyError) {
            console.warn('[Consistency] Checker failed (non-blocking):', consistencyError);
          }
        })();
      }
      
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Request cancelled')) {
        console.log('Generation aborted');
        cancelStep(stepId);
      } else {
        console.error(`Generation failed for ${stepId}:`, error);
        setStepError(stepId, error instanceof Error ? error.message : 'Unknown error');
      }
      // Release lock on error
      forceResetGeneration();
    } finally {
      abortControllerRef.current = null;
    }
  }, [startStep, updateStepContent, completeStep, setStepError, cancelStep, forceResetGeneration]);

  const stop = useCallback(() => {
    console.log('[Generator] Stop requested. AbortController exists:', !!abortControllerRef.current);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      forceResetGeneration();
      console.log('[Generator] Generation stopped and lock released.');
    } else {
      // Even if no abort controller, try to release the lock in case of stuck state
      const { isGenerating } = useWorkflowStore.getState();
      if (isGenerating) {
        console.log('[Generator] No abort controller but isGenerating=true. Forcing lock release.');
        forceResetGeneration();
      }
    }
  }, [forceResetGeneration]);

  return { generate, stop };
}
