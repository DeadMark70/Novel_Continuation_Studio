import { useRef, useCallback } from 'react';
import { useWorkflowStore, WorkflowStepId } from '@/store/useWorkflowStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNovelStore } from '@/store/useNovelStore';
import { generateStream } from '@/lib/nim-client';
import { injectPrompt } from '@/lib/prompt-engine';
import { DEFAULT_PROMPTS } from '@/lib/prompts';
import { canAttemptThinking } from '@/lib/thinking-mode';
import {
  buildCompressionSource,
  parseCompressionArtifacts,
  shouldRunCompression,
} from '@/lib/compression';
import { runConsistencyCheck } from '@/lib/consistency-checker';

type PromptTemplateKey = keyof typeof DEFAULT_PROMPTS;

function resolvePromptTemplateKey(stepId: WorkflowStepId, useCompressedContext: boolean): PromptTemplateKey {
  if (stepId === 'chapter1') {
    return useCompressedContext ? 'chapter1Compressed' : 'chapter1Raw';
  }

  if (stepId === 'continuation') {
    return useCompressedContext ? 'continuationCompressed' : 'continuationRaw';
  }

  return stepId;
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
      const {
        apiKey,
        selectedModel,
        customPrompts,
        truncationThreshold,
        dualEndBuffer,
        compressionMode,
        compressionAutoThreshold,
        compressionChunkSize,
        compressionChunkOverlap,
        compressionEvidenceSegments,
        thinkingEnabled,
        modelCapabilities,
      } = useSettingsStore.getState();
      const {
        originalNovel,
        analysis,
        outline,
        breakdown,
        chapters,
        targetStoryWordCount,
        targetChapterCount,
        characterCards,
        styleGuide,
        compressionOutline,
        evidencePack,
        compressedContext,
      } = useNovelStore.getState();
      const modelCapability = modelCapabilities[selectedModel];
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
      }

      const resolvedPromptTemplateKey = resolvePromptTemplateKey(stepId, canUseCompressedContext);
      const template = (
        customPrompts[resolvedPromptTemplateKey] ||
        customPrompts[stepId] ||
        DEFAULT_PROMPTS[resolvedPromptTemplateKey] ||
        DEFAULT_PROMPTS[stepId]
      );
      if (!template) throw new Error(`No prompt template found for ${stepId}`);

      let compressionChunkCount = 0;
      let compressionSampledChunkCount = 0;
      let resolvedOriginalNovel = originalNovel;
      let compressionOutlineTargetRange = '';

      if (stepId === 'compression') {
        const builtSource = buildCompressionSource(originalNovel, {
          chunkSize: compressionChunkSize,
          overlap: compressionChunkOverlap,
          maxSegments: compressionEvidenceSegments,
        });
        resolvedOriginalNovel = builtSource.sourceText;
        compressionChunkCount = builtSource.chunkCount;
        compressionSampledChunkCount = builtSource.sampledChunkCount;

        if (sourceChars <= 70000) {
          compressionOutlineTargetRange = '5000-7000';
        } else if (sourceChars <= 85000) {
          compressionOutlineTargetRange = '7000-8500';
        } else {
          compressionOutlineTargetRange = '8500-10000';
        }
      } else if (canUseCompressedContext) {
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
        compressedContext: canUseCompressedContext ? compressedContext : '',
        characterCards,
        styleGuide,
        compressionOutline,
        evidencePack,
        compressionOutlineTargetRange,
        compressionChunkCount,
        compressionSampledChunkCount,
      });

      if (modelCapability && !modelCapability.chatSupported) {
        throw new Error(`Model "${selectedModel}" is marked as unavailable: ${modelCapability.reason || 'Unsupported model.'}`);
      }

      const canUseThinking = canAttemptThinking(thinkingEnabled, modelCapability);

      // 3. Stream
      const stream = generateStream(
        prompt, 
        selectedModel, 
        apiKey, 
        undefined, 
        {
          enableThinking: canUseThinking,
          thinkingSupported: canUseThinking,
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

      // 4. Complete - content is already in workflowStore via updateStepContent
      // completeStep will sync to novelStore, release the isGenerating lock, and handle automation timing
      if (stepId === 'compression') {
        const parsed = parseCompressionArtifacts(content);
        const compressedChars = parsed.compressedContext.length;

        await useNovelStore.getState().updateWorkflow({
          ...parsed,
          compressionMeta: {
            sourceChars,
            compressedChars,
            ratio: sourceChars > 0 ? Number((compressedChars / sourceChars).toFixed(4)) : 0,
            chunkCount: compressionChunkCount || compressionSampledChunkCount,
            generatedAt: Date.now(),
            skipped: false,
          },
        });
      }

      await completeStep(stepId);

      if (stepId === 'chapter1' || stepId === 'continuation') {
        const latestGeneratedChapter = content;
        const consistencyTemplate = customPrompts.consistency || DEFAULT_PROMPTS.consistency;
        const canRunLlmChecker = Boolean(apiKey?.trim());

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
                const checkerStream = generateStream(
                  checkerPrompt,
                  selectedModel,
                  apiKey,
                  undefined,
                  {
                    enableThinking: false,
                    thinkingSupported: false,
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
