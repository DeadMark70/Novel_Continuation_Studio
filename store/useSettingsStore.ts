import { create } from 'zustand';
import { saveSettings, getSettings } from '@/lib/db';

interface SettingsState {
  apiKey: string;
  selectedModel: string;
  recentModels: string[];
  customPrompts: Record<string, string>;
  
  // Actions
  setApiKey: (key: string) => Promise<void>;
  setSelectedModel: (model: string) => Promise<void>;
  addRecentModel: (model: string) => Promise<void>;
  setCustomPrompt: (key: string, prompt: string) => Promise<void>;
  resetPrompt: (key: string) => Promise<void>;
  initialize: () => Promise<void>;
  persist: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKey: '',
  selectedModel: 'meta/llama3-70b-instruct', // Default fallback
  recentModels: [],
  customPrompts: {},

  setApiKey: async (key: string) => {
    set({ apiKey: key });
    await get().persist();
  },

  setSelectedModel: async (model: string) => {
    set({ selectedModel: model });
    await get().addRecentModel(model); // Also add to history
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
    });
  }
}));