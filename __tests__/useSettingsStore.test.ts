import { useSettingsStore } from '../store/useSettingsStore';
import { act } from '@testing-library/react';
import { db } from '../lib/db';

describe('useSettingsStore', () => {
  beforeEach(async () => {
    if (!db.isOpen()) {
      await db.open();
    }
    await db.settings.clear();
    act(() => {
      useSettingsStore.setState({
        apiKey: '',
        selectedModel: 'meta/llama3-70b-instruct',
        recentModels: [],
        customPrompts: {},
      });
    });
  });

  afterAll(async () => {
    await db.close();
  });

  it('should update and persist API key', async () => {
    await act(async () => {
      await useSettingsStore.getState().setApiKey('test-key');
    });
    
    expect(useSettingsStore.getState().apiKey).toBe('test-key');
    
    const stored = await db.settings.get('global');
    expect(stored?.apiKey).toBe('test-key');
  });

  it('should update model and add to history', async () => {
    await act(async () => {
      await useSettingsStore.getState().setSelectedModel('new-model');
    });
    
    const state = useSettingsStore.getState();
    expect(state.selectedModel).toBe('new-model');
    expect(state.recentModels).toContain('new-model');
    
    const stored = await db.settings.get('global');
    expect(stored?.selectedModel).toBe('new-model');
    expect(stored?.recentModels).toContain('new-model');
  });

  it('should load settings on initialize', async () => {
    await db.settings.put({
      id: 'global',
      apiKey: 'loaded-key',
      selectedModel: 'loaded-model',
      recentModels: ['loaded-model'],
      customPrompts: { prompt1: 'custom' },
      updatedAt: Date.now()
    });

    await act(async () => {
      await useSettingsStore.getState().initialize();
    });

    const state = useSettingsStore.getState();
    expect(state.apiKey).toBe('loaded-key');
    expect(state.selectedModel).toBe('loaded-model');
    expect(state.customPrompts['prompt1']).toBe('custom');
  });
});
