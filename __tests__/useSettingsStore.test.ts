import { act } from '@testing-library/react';
import { vi } from 'vitest';
import { db } from '../lib/db';
import { useSettingsStore } from '../store/useSettingsStore';

describe('useSettingsStore', () => {
  beforeEach(async () => {
    if (!db.isOpen()) {
      await db.open();
    }
    await db.settings.clear();
    act(() => {
      useSettingsStore.setState({
        ...useSettingsStore.getInitialState(),
      });
    });
  });

  afterAll(async () => {
    await db.close();
  });

  it('updates provider API key and compatibility field', async () => {
    await act(async () => {
      await useSettingsStore.getState().setActiveProvider('openrouter');
      await useSettingsStore.getState().setProviderApiKey('openrouter', 'or-key');
    });

    const state = useSettingsStore.getState();
    expect(state.providers.openrouter.apiKey).toBe('or-key');
    expect(state.apiKey).toBe('or-key');
  });

  it('resolves generation config per phase with explicit provider/model', async () => {
    await act(async () => {
      await useSettingsStore.getState().setProviderSelectedModel('nim', 'nim-default');
      await useSettingsStore.getState().setPhaseSelection('analysis', {
        provider: 'openrouter',
        model: 'openrouter/custom-model',
      });
      await useSettingsStore.getState().setProviderApiKey('openrouter', 'or-key');
      await useSettingsStore.getState().setProviderDefaultParams('openrouter', {
        maxTokens: 2048,
        temperature: 0.4,
        topP: 0.9,
        thinkingEnabled: false,
      });
    });

    const resolved = useSettingsStore.getState().getResolvedGenerationConfig('analysis');
    expect(resolved.provider).toBe('openrouter');
    expect(resolved.model).toBe('openrouter/custom-model');
    expect(resolved.apiKey).toBe('or-key');
    expect(resolved.params.maxTokens).toBe(2048);
  });

  it('fetchProviderModels stores model ids in recentModels', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'openai/gpt-4o-mini', supportedParameters: ['temperature', 'top_p'] },
          { id: 'anthropic/claude-3.5-sonnet', supportedParameters: ['temperature'] },
        ],
      }),
    } as Response);

    await act(async () => {
      const ids = await useSettingsStore.getState().fetchProviderModels('openrouter', 'or-key');
      expect(ids).toEqual(['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet']);
    });

    const state = useSettingsStore.getState();
    expect(state.providers.openrouter.recentModels).toContain('openai/gpt-4o-mini');
    expect(state.providers.openrouter.modelParameterSupport['openai/gpt-4o-mini']).toContain('temperature');
    fetchSpy.mockRestore();
  });

  it('initializes from legacy settings payload', async () => {
    await db.settings.put({
      id: 'global',
      apiKey: 'legacy-key',
      selectedModel: 'legacy-model',
      recentModels: ['legacy-model'],
      customPrompts: { prompt1: 'custom' },
      modelCapabilities: {
        'legacy-model': {
          chatSupported: true,
          thinkingSupported: 'supported',
          checkedAt: Date.now(),
          source: 'probe',
        },
      },
      thinkingEnabled: true,
      updatedAt: Date.now(),
    });

    await act(async () => {
      await useSettingsStore.getState().initialize();
    });

    const state = useSettingsStore.getState();
    expect(state.providers.nim.apiKey).toBe('legacy-key');
    expect(state.providers.nim.selectedModel).toBe('legacy-model');
    expect(state.providerDefaults.nim.thinkingEnabled).toBe(true);
  });
});
