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

  it('applies model override over provider default for resolved config', async () => {
    await act(async () => {
      await useSettingsStore.getState().setProviderSelectedModel('nim', 'nim-model-a');
      await useSettingsStore.getState().setProviderDefaultParams('nim', {
        maxTokens: 3000,
        temperature: 0.6,
        topP: 0.9,
        thinkingEnabled: false,
      });
      await useSettingsStore.getState().setModelOverrideParams('nim', 'nim-model-a', {
        maxTokens: 1200,
        temperature: 0.2,
      });
      await useSettingsStore.getState().setPhaseSelection('analysis', {
        provider: 'nim',
        model: 'nim-model-a',
      });
    });

    const resolved = useSettingsStore.getState().getResolvedGenerationConfig('analysis');
    expect(resolved.params.maxTokens).toBe(1200);
    expect(resolved.params.temperature).toBe(0.2);
    expect(resolved.params.topP).toBe(0.9);
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

  it('applySettingsSnapshot replaces model overrides atomically', async () => {
    await act(async () => {
      await useSettingsStore.getState().setModelOverrideParams('nim', 'nim-model-a', {
        maxTokens: 1200,
      });
    });

    const before = useSettingsStore.getState();
    expect(before.modelOverrides.nim['nim-model-a']).toBeDefined();

    await act(async () => {
      await useSettingsStore.getState().applySettingsSnapshot({
        activeProvider: before.activeProvider,
        providers: before.providers,
        phaseConfig: before.phaseConfig,
        providerDefaults: before.providerDefaults,
        modelOverrides: { nim: {}, openrouter: {} },
        customPrompts: before.customPrompts,
        context: {
          truncationThreshold: before.truncationThreshold,
          dualEndBuffer: before.dualEndBuffer,
          compressionMode: before.compressionMode,
          compressionAutoThreshold: before.compressionAutoThreshold,
          compressionChunkSize: before.compressionChunkSize,
          compressionChunkOverlap: before.compressionChunkOverlap,
          compressionEvidenceSegments: before.compressionEvidenceSegments,
        },
      });
    });

    const after = useSettingsStore.getState();
    expect(after.modelOverrides.nim['nim-model-a']).toBeUndefined();
  });

  it('tracks persist metrics after snapshot apply', async () => {
    const before = useSettingsStore.getState();

    await act(async () => {
      await useSettingsStore.getState().applySettingsSnapshot({
        activeProvider: before.activeProvider,
        providers: before.providers,
        phaseConfig: before.phaseConfig,
        providerDefaults: before.providerDefaults,
        modelOverrides: before.modelOverrides,
        customPrompts: before.customPrompts,
        context: {
          truncationThreshold: before.truncationThreshold,
          dualEndBuffer: before.dualEndBuffer,
          compressionMode: before.compressionMode,
          compressionAutoThreshold: before.compressionAutoThreshold,
          compressionChunkSize: before.compressionChunkSize,
          compressionChunkOverlap: before.compressionChunkOverlap,
          compressionEvidenceSegments: before.compressionEvidenceSegments,
        },
      });
    });

    const after = useSettingsStore.getState();
    expect(after.persistCount).toBeGreaterThan(0);
    expect(after.lastPersistDurationMs).toBeTypeOf('number');
    expect(after.lastPersistAt).toBeTypeOf('number');
  });
});
