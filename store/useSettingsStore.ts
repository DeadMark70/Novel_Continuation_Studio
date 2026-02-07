import { create } from 'zustand';
import { saveSettings, getSettings } from '@/lib/db';
import { fetchModelCapability, type ModelCapability } from '@/lib/nim-client';
import { getModelCapabilityOverride } from '@/lib/nim-model-overrides';

interface SettingsState {
  apiKey: string;
  selectedModel: string;
  recentModels: string[];
  customPrompts: Record<string, string>;
  truncationThreshold: number;
  dualEndBuffer: number;
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
  updateContextSettings: (settings: Partial<Pick<SettingsState, 'truncationThreshold' | 'dualEndBuffer'>>) => Promise<void>;
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
  thinkingEnabled: false,
  modelCapabilities: {},

  setApiKey: async (key: string) => {
    set({ apiKey: key });
    await get().persist();
  },

  setSelectedModel: async (model: string) => {
    set({ selectedModel: model });
    await get().addRecentModel(model);
    try {
      const capability = await get().probeModelCapability(model);
      await get().upsertModelCapability(model, capability);
    } catch (error) {
      console.warn('Capability probe failed:', error);
    }
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

    try {
      const capability = await fetchModelCapability(model, resolvedApiKey);
      return capability;
    } catch (error) {
      if (override) {
        return override;
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
    set((state) => ({ ...state, ...settings }));
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
      thinkingEnabled: state.thinkingEnabled,
      modelCapabilities: state.modelCapabilities,
    });
  }
}));
