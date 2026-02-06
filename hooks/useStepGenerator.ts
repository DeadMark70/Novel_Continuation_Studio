import { useRef, useCallback } from 'react';
import { useWorkflowStore, WorkflowStepId } from '@/store/useWorkflowStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNovelStore } from '@/store/useNovelStore';
import { generateStream } from '@/lib/nim-client';
import { injectPrompt } from '@/lib/prompt-engine';
import { DEFAULT_PROMPTS } from '@/lib/prompts';

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
      const { apiKey, selectedModel, customPrompts, truncationThreshold, dualEndBuffer } = useSettingsStore.getState(); // <-- FRESH
      const { originalNovel, analysis, outline, breakdown, chapters } = useNovelStore.getState(); // <-- FRESH

      console.log(`[Generator] Generating ${stepId}. Reading from NovelStore:`);
      console.log(`  - Analysis length: ${analysis?.length || 0}`);
      console.log(`  - Outline length: ${outline?.length || 0}`);
      console.log(`  - Breakdown length: ${breakdown?.length || 0}`);
      console.log(`  - Chapters count: ${chapters?.length || 0}`);
      // alert(`[DEBUG] Generating ${stepId}. Outline Length: ${outline?.length}`);

      const template = customPrompts[stepId] || DEFAULT_PROMPTS[stepId]; 
      if (!template) throw new Error(`No prompt template found for ${stepId}`);

      const prompt = injectPrompt(template, {
        originalNovel,
        analysis,
        outline,
        breakdown,
        previousChapters: chapters,
        userNotes,
        nextChapterNumber: chapters.length + 1,
        truncationThreshold,
        dualEndBuffer
      });

      // 3. Stream
      const stream = generateStream(
        prompt, 
        selectedModel, 
        apiKey, 
        undefined, 
        {
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
      await completeStep(stepId);
      
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
