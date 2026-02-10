import { create } from 'zustand';
import { saveSettings, getSettings } from '@/lib/db';
import { fetchModelCapability, type ModelCapability } from '@/lib/nim-client';
import { getModelCapabilityOverride } from '@/lib/nim-model-overrides';
import {
  DEFAULT_COMPRESSION_AUTO_THRESHOLD,
  DEFAULT_COMPRESSION_CHUNK_OVERLAP,
  DEFAULT_COMPRESSION_CHUNK_SIZE,
  DEFAULT_COMPRESSION_EVIDENCE_SEGMENTS,
  DEFAULT_COMPRESSION_MODE,
  type CompressionMode,
} from '@/lib/compression';

const CAPABILITY_CACHE_TTL_MS = 10 * 60 * 1000;

function isCapabilityFresh(capability?: ModelCapability): boolean {
  if (!capability) {
    return false;
  }
  return Date.now() - capability.checkedAt < CAPABILITY_CACHE_TTL_MS;
}

function isRateLimitReason(reason?: string): boolean {
  if (!reason) {
    return false;
  }
  return reason.includes('429') || reason.toLowerCase().includes('too many requests');
}

function sanitizePositiveInt(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

interface SettingsState {
  apiKey: string;
  selectedModel: string;
  recentModels: string[];
  customPrompts: Record<string, string>;
  truncationThreshold: number;
  dualEndBuffer: number;
  compressionMode: CompressionMode;
  compressionAutoThreshold: number;
  compressionChunkSize: number;
  compressionChunkOverlap: number;
  compressionEvidenceSegments: number;
  thinkingEnabled: boolean;
  modelCapabilities: Record<string, ModelCapability>;
  
  // Actions
  setApiKey: (key: string) => Promise<void>;
  setSelectedModel: (model: string) => Promise<void>;
  addRecentModel: (model: string) => Promise<void>;
  setCustomPrompt: (key: string, prompt: string) => Promise<void>;
  setThinkingEnabled: (enabled: boolean) => Promise<void>;
  upsertModelCapability: (model: string, capability: ModelCapability) => Promise<void>;
  probeModelCapability: (model: string, apiKey?: string) => Promise<ModelCapability>;
  updateContextSettings: (settings: Partial<Pick<
    SettingsState,
    | 'truncationThreshold'
    | 'dualEndBuffer'
    | 'compressionMode'
    | 'compressionAutoThreshold'
    | 'compressionChunkSize'
    | 'compressionChunkOverlap'
    | 'compressionEvidenceSegments'
  >>) => Promise<void>;
  resetPrompt: (key: string) => Promise<void>;
  initialize: () => Promise<void>;
  persist: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKey: '',
  selectedModel: 'meta/llama3-70b-instruct', // Default fallback
  recentModels: [],
  customPrompts: {},
  truncationThreshold: 800,
  dualEndBuffer: 400,
  compressionMode: DEFAULT_COMPRESSION_MODE,
  compressionAutoThreshold: DEFAULT_COMPRESSION_AUTO_THRESHOLD,
  compressionChunkSize: DEFAULT_COMPRESSION_CHUNK_SIZE,
  compressionChunkOverlap: DEFAULT_COMPRESSION_CHUNK_OVERLAP,
  compressionEvidenceSegments: DEFAULT_COMPRESSION_EVIDENCE_SEGMENTS,
  thinkingEnabled: false,
  modelCapabilities: {},

  setApiKey: async (key: string) => {
    set({ apiKey: key });
    await get().persist();
  },

  setSelectedModel: async (model: string) => {
    set({ selectedModel: model });
    await get().addRecentModel(model);

    const existingCapability = get().modelCapabilities[model];
    if (isCapabilityFresh(existingCapability)) {
      return;
    }

    void (async () => {
      try {
        const capability = await get().probeModelCapability(model);
        await get().upsertModelCapability(model, capability);
      } catch (error) {
        console.warn('Capability probe failed:', error);
      }
    })();
  },

  addRecentModel: async (model: string) => {
    const { recentModels } = get();
    // Move to top, limit to 5
    const newRecent = [model, ...recentModels.filter(m => m !== model)].slice(0, 5);
    set({ recentModels: newRecent });
    await get().persist();
  },

  setCustomPrompt: async (key: string, prompt: string) => {
    const { customPrompts } = get();
    set({ customPrompts: { ...customPrompts, [key]: prompt } });
    await get().persist();
  },

  setThinkingEnabled: async (enabled: boolean) => {
    set({ thinkingEnabled: enabled });
    await get().persist();
  },

  upsertModelCapability: async (model: string, capability: ModelCapability) => {
    const { modelCapabilities } = get();
    set({
      modelCapabilities: {
        ...modelCapabilities,
        [model]: capability
      }
    });
    await get().persist();
  },

  probeModelCapability: async (model: string, apiKeyOverride?: string) => {
    const override = getModelCapabilityOverride(model);
    const resolvedApiKey = apiKeyOverride ?? get().apiKey;
    const existingCapability = get().modelCapabilities[model];

    try {
      const capability = await fetchModelCapability(model, resolvedApiKey);
      if (
        capability.thinkingSupported === 'unknown' &&
        isRateLimitReason(capability.reason) &&
        existingCapability
      ) {
        return existingCapability;
      }
      return capability;
    } catch (error) {
      if (override) {
        return override;
      }

      if (existingCapability) {
        return existingCapability;
      }

      return {
        chatSupported: true,
        thinkingSupported: 'unknown',
        reason: error instanceof Error ? error.message : 'Capability probe failed',
        checkedAt: Date.now(),
        source: 'probe',
      };
    }
  },

  updateContextSettings: async (settings) => {
    set((state) => ({
      ...state,
      ...settings,
      truncationThreshold: settings.truncationThreshold === undefined
        ? state.truncationThreshold
        : sanitizePositiveInt(settings.truncationThreshold, state.truncationThreshold),
      dualEndBuffer: settings.dualEndBuffer === undefined
        ? state.dualEndBuffer
        : sanitizePositiveInt(settings.dualEndBuffer, state.dualEndBuffer),
      compressionMode: settings.compressionMode ?? state.compressionMode,
      compressionAutoThreshold: settings.compressionAutoThreshold === undefined
        ? state.compressionAutoThreshold
        : sanitizePositiveInt(settings.compressionAutoThreshold, state.compressionAutoThreshold),
      compressionChunkSize: settings.compressionChunkSize === undefined
        ? state.compressionChunkSize
        : sanitizePositiveInt(settings.compressionChunkSize, state.compressionChunkSize),
      compressionChunkOverlap: settings.compressionChunkOverlap === undefined
        ? state.compressionChunkOverlap
        : Math.max(0, sanitizePositiveInt(settings.compressionChunkOverlap, state.compressionChunkOverlap)),
      compressionEvidenceSegments: settings.compressionEvidenceSegments === undefined
        ? state.compressionEvidenceSegments
        : Math.max(4, Math.min(16, sanitizePositiveInt(settings.compressionEvidenceSegments, state.compressionEvidenceSegments))),
    }));
    await get().persist();
  },

  resetPrompt: async (key: string) => {
    const { customPrompts } = get();
    const newPrompts = { ...customPrompts };
    delete newPrompts[key];
    set({ customPrompts: newPrompts });
    await get().persist();
  },

  initialize: async () => {
    try {
      const settings = await getSettings();
      if (settings) {
        set({
          apiKey: settings.apiKey || '',
          selectedModel: settings.selectedModel || 'meta/llama3-70b-instruct',
          recentModels: settings.recentModels || [],
          customPrompts: settings.customPrompts || {},
          truncationThreshold: settings.truncationThreshold ?? 800,
          dualEndBuffer: settings.dualEndBuffer ?? 400,
          compressionMode: settings.compressionMode ?? DEFAULT_COMPRESSION_MODE,
          compressionAutoThreshold: settings.compressionAutoThreshold ?? DEFAULT_COMPRESSION_AUTO_THRESHOLD,
          compressionChunkSize: settings.compressionChunkSize ?? DEFAULT_COMPRESSION_CHUNK_SIZE,
          compressionChunkOverlap: settings.compressionChunkOverlap ?? DEFAULT_COMPRESSION_CHUNK_OVERLAP,
          compressionEvidenceSegments: settings.compressionEvidenceSegments ?? DEFAULT_COMPRESSION_EVIDENCE_SEGMENTS,
          thinkingEnabled: settings.thinkingEnabled ?? false,
          modelCapabilities: settings.modelCapabilities ?? {},
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  // Helper to save current state
  persist: async () => {
    const state = get();
    await saveSettings({
      apiKey: state.apiKey,
      selectedModel: state.selectedModel,
      recentModels: state.recentModels,
      customPrompts: state.customPrompts,
      truncationThreshold: state.truncationThreshold,
      dualEndBuffer: state.dualEndBuffer,
      compressionMode: state.compressionMode,
      compressionAutoThreshold: state.compressionAutoThreshold,
      compressionChunkSize: state.compressionChunkSize,
      compressionChunkOverlap: state.compressionChunkOverlap,
      compressionEvidenceSegments: state.compressionEvidenceSegments,
      thinkingEnabled: state.thinkingEnabled,
      modelCapabilities: state.modelCapabilities,
    });
  }
}));
