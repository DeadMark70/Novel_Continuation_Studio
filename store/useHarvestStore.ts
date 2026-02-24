import { create } from 'zustand';
import type { HarvestedTemplateCandidate } from '@/lib/llm-types';
import { useSettingsStore } from '@/store/useSettingsStore';
import { generateStreamByProvider } from '@/lib/nim-client';
import {
  buildSensoryTemplateHarvestPrompt,
  parseHarvestCandidates,
} from '@/lib/sensory-template-harvest';

type HarvestStatus = 'idle' | 'running' | 'success' | 'error';

interface HarvestState {
  status: HarvestStatus;
  statusText: string | null;
  error: string | null;
  rawOutput: string;
  candidates: HarvestedTemplateCandidate[];
  isSaving: boolean;
  showResultDialog: boolean;
  showErrorDialog: boolean;
  startedAt?: number;
  finishedAt?: number;

  startHarvest: (sourceText: string) => Promise<void>;
  cancelHarvest: () => void;
  setShowResultDialog: (open: boolean) => void;
  setShowErrorDialog: (open: boolean) => void;
  applyManualJsonAndParse: (rawText: string) => void;
  saveSelectedCandidates: (selected: HarvestedTemplateCandidate[]) => Promise<void>;
  clearTask: () => void;
}

let activeAbortController: AbortController | null = null;

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Harvest failed.';
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (
    error.name === 'AbortError' || error.message.toLowerCase().includes('abort')
  );
}

export const useHarvestStore = create<HarvestState>((set, get) => ({
  status: 'idle',
  statusText: null,
  error: null,
  rawOutput: '',
  candidates: [],
  isSaving: false,
  showResultDialog: false,
  showErrorDialog: false,
  startedAt: undefined,
  finishedAt: undefined,

  startHarvest: async (sourceText) => {
    const trimmedSource = sourceText.trim();
    if (!trimmedSource) {
      set({
        status: 'error',
        statusText: '已完成',
        error: 'No source text found for harvesting.',
        showErrorDialog: true,
      });
      return;
    }

    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }

    const controller = new AbortController();
    activeAbortController = controller;
    let rawOutput = '';

    set({
      status: 'running',
      statusText: '處理中...',
      error: null,
      rawOutput: '',
      candidates: [],
      isSaving: false,
      showResultDialog: false,
      showErrorDialog: false,
      startedAt: Date.now(),
      finishedAt: undefined,
    });

    try {
      const settingsState = useSettingsStore.getState();
      const config = settingsState.getResolvedGenerationConfig('sensoryHarvest');
      const prompt = buildSensoryTemplateHarvestPrompt(trimmedSource);
      const stream = generateStreamByProvider(
        config.provider,
        prompt,
        config.model,
        config.apiKey,
        undefined,
        {
          maxTokens: config.params.autoMaxTokens ? undefined : config.params.maxTokens,
          autoMaxTokens: config.params.autoMaxTokens,
          temperature: config.params.temperature,
          topP: config.params.topP,
          topK: config.params.topK,
          frequencyPenalty: config.params.frequencyPenalty,
          presencePenalty: config.params.presencePenalty,
          seed: config.params.seed,
          enableThinking: false,
          thinkingSupported: false,
          supportedParameters: config.supportedParameters,
          maxContextTokens: config.maxContextTokens,
          maxCompletionTokens: config.maxCompletionTokens,
        },
        controller.signal
      );

      for await (const chunk of stream) {
        rawOutput += chunk;
      }

      const candidates = parseHarvestCandidates(rawOutput);
      set({
        status: 'success',
        statusText: '已完成',
        error: null,
        rawOutput,
        candidates,
        showResultDialog: true,
        showErrorDialog: false,
        finishedAt: Date.now(),
      });
    } catch (error) {
      const message = isAbortError(error) ? 'Harvest cancelled.' : toErrorMessage(error);
      set({
        status: 'error',
        statusText: '已完成',
        error: message,
        rawOutput,
        showResultDialog: false,
        showErrorDialog: true,
        finishedAt: Date.now(),
      });
    } finally {
      if (activeAbortController === controller) {
        activeAbortController = null;
      }
    }
  },

  cancelHarvest: () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    set({
      status: 'idle',
      statusText: null,
      error: null,
      showResultDialog: false,
      showErrorDialog: false,
    });
  },

  setShowResultDialog: (open) => {
    set({ showResultDialog: open });
  },

  setShowErrorDialog: (open) => {
    set({ showErrorDialog: open });
  },

  applyManualJsonAndParse: (rawText) => {
    try {
      const candidates = parseHarvestCandidates(rawText);
      set({
        status: 'success',
        statusText: '已完成',
        error: null,
        rawOutput: rawText,
        candidates,
        showResultDialog: true,
        showErrorDialog: false,
      });
    } catch (error) {
      set({
        status: 'error',
        statusText: '已完成',
        error: toErrorMessage(error),
        rawOutput: rawText,
        showResultDialog: false,
        showErrorDialog: true,
      });
    }
  },

  saveSelectedCandidates: async (selected) => {
    if (!Array.isArray(selected) || selected.length === 0) {
      return;
    }
    set({ isSaving: true, error: null });
    try {
      await useSettingsStore.getState().addSensoryTemplatesFromHarvest(selected);
      const current = get();
      set({
        status: 'success',
        statusText: `已完成（已儲存 ${selected.length} 筆）`,
        error: null,
        showResultDialog: false,
        showErrorDialog: false,
        candidates: current.candidates,
      });
    } catch (error) {
      set({
        status: 'error',
        statusText: '已完成',
        error: toErrorMessage(error),
        showErrorDialog: true,
      });
    } finally {
      set({ isSaving: false });
    }
  },

  clearTask: () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    set({
      status: 'idle',
      statusText: null,
      error: null,
      rawOutput: '',
      candidates: [],
      isSaving: false,
      showResultDialog: false,
      showErrorDialog: false,
      startedAt: undefined,
      finishedAt: undefined,
    });
  },
}));
