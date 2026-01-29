import { useRef, useCallback } from 'react';
import { useWorkflowStore, WorkflowStepId } from '@/store/useWorkflowStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNovelStore } from '@/store/useNovelStore';
import { generateStream } from '@/lib/nim-client';
import { injectPrompt } from '@/lib/prompt-engine';

export function useStepGenerator() {
  const { startStep, updateStepContent, completeStep, setStepError } = useWorkflowStore();
  const { apiKey, selectedModel, customPrompts } = useSettingsStore();
  const { originalNovel, analysis, outline, chapters } = useNovelStore();
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (stepId: WorkflowStepId, userNotes?: string) => {
    // 1. Setup
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    startStep(stepId);
    let content = '';

    try {
      // 2. Prepare Context & Prompt
      // Get the raw template (or default if missing)
      // Note: We should probably export DEFAULT_PROMPTS or handle defaults in store more robustly
      // For now, assuming store has it or we fallback
      const template = customPrompts[stepId] || ''; 
      if (!template) throw new Error(`No prompt template found for ${stepId}`);

      const prompt = injectPrompt(template, {
        originalNovel,
        analysis,
        outline,
        breakdown: '', // TODO: Breakdown state in NovelStore?
        previousChapters: chapters,
        userNotes
      });

      // 3. Stream
      const stream = generateStream(
        prompt, 
        selectedModel, 
        apiKey, 
        undefined, 
        undefined, 
        abortControllerRef.current.signal
      );

      for await (const chunk of stream) {
        content += chunk;
        updateStepContent(stepId, content);
      }

      // 4. Complete
      await completeStep(stepId);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Generation aborted');
      } else {
        console.error(`Generation failed for ${stepId}:`, error);
        setStepError(stepId, error instanceof Error ? error.message : 'Unknown error');
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [apiKey, selectedModel, customPrompts, originalNovel, analysis, outline, chapters, startStep, updateStepContent, completeStep, setStepError]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return { generate, stop };
}
