import { act } from '@testing-library/react';
import { vi } from 'vitest';
import { db } from '../lib/db';
import * as dbModule from '../lib/db';
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

  it('includes loreJsonRepair phase in resolved generation config', () => {
    const resolved = useSettingsStore.getState().getResolvedGenerationConfig('loreJsonRepair');
    expect(resolved.provider).toBe('nim');
    expect(resolved.model).toBeTruthy();
    expect(resolved.params.maxTokens).toBeGreaterThan(0);
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

  it('clamps provider default numeric params to valid ranges', async () => {
    await act(async () => {
      await useSettingsStore.getState().setProviderDefaultParams('nim', {
        temperature: 99,
        topP: -3,
        topK: -4,
      });
    });

    const resolved = useSettingsStore.getState().getResolvedGenerationConfig('analysis');
    expect(resolved.params.temperature).toBe(2);
    expect(resolved.params.topP).toBe(0);
    expect(resolved.params.topK).toBe(1);
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
        sensoryAnchorTemplates: before.sensoryAnchorTemplates,
        sensoryAutoTemplateByPhase: before.sensoryAutoTemplateByPhase,
        context: {
          truncationThreshold: before.truncationThreshold,
          dualEndBuffer: before.dualEndBuffer,
          compressionMode: before.compressionMode,
          compressionAutoThreshold: before.compressionAutoThreshold,
          compressionChunkSize: before.compressionChunkSize,
          compressionChunkOverlap: before.compressionChunkOverlap,
          compressionEvidenceSegments: before.compressionEvidenceSegments,
          autoResumeOnLength: before.autoResumeOnLength,
          autoResumePhaseAnalysis: before.autoResumePhaseAnalysis,
          autoResumePhaseOutline: before.autoResumePhaseOutline,
          autoResumeMaxRounds: before.autoResumeMaxRounds,
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
        sensoryAnchorTemplates: before.sensoryAnchorTemplates,
        sensoryAutoTemplateByPhase: before.sensoryAutoTemplateByPhase,
        context: {
          truncationThreshold: before.truncationThreshold,
          dualEndBuffer: before.dualEndBuffer,
          compressionMode: before.compressionMode,
          compressionAutoThreshold: before.compressionAutoThreshold,
          compressionChunkSize: before.compressionChunkSize,
          compressionChunkOverlap: before.compressionChunkOverlap,
          compressionEvidenceSegments: before.compressionEvidenceSegments,
          autoResumeOnLength: before.autoResumeOnLength,
          autoResumePhaseAnalysis: before.autoResumePhaseAnalysis,
          autoResumePhaseOutline: before.autoResumePhaseOutline,
          autoResumeMaxRounds: before.autoResumeMaxRounds,
        },
      });
    });

    const after = useSettingsStore.getState();
    expect(after.persistCount).toBeGreaterThan(0);
    expect(after.lastPersistDurationMs).toBeTypeOf('number');
    expect(after.lastPersistAt).toBeTypeOf('number');
  });

  it('persists openrouter selected model across initialize', async () => {
    const state = useSettingsStore.getState();
    const customModel = 'openai/gpt-4o-mini-persist-check';

    await act(async () => {
      await useSettingsStore.getState().applySettingsSnapshot({
        activeProvider: 'openrouter',
        providers: {
          ...state.providers,
          openrouter: {
            ...state.providers.openrouter,
            selectedModel: customModel,
          },
        },
        phaseConfig: state.phaseConfig,
        providerDefaults: state.providerDefaults,
        modelOverrides: state.modelOverrides,
        customPrompts: state.customPrompts,
        sensoryAnchorTemplates: state.sensoryAnchorTemplates,
        sensoryAutoTemplateByPhase: state.sensoryAutoTemplateByPhase,
        context: {
          truncationThreshold: state.truncationThreshold,
          dualEndBuffer: state.dualEndBuffer,
          compressionMode: state.compressionMode,
          compressionAutoThreshold: state.compressionAutoThreshold,
          compressionChunkSize: state.compressionChunkSize,
          compressionChunkOverlap: state.compressionChunkOverlap,
          compressionEvidenceSegments: state.compressionEvidenceSegments,
          autoResumeOnLength: state.autoResumeOnLength,
          autoResumePhaseAnalysis: state.autoResumePhaseAnalysis,
          autoResumePhaseOutline: state.autoResumePhaseOutline,
          autoResumeMaxRounds: state.autoResumeMaxRounds,
        },
      });
    });

    act(() => {
      useSettingsStore.setState({
        ...useSettingsStore.getInitialState(),
      });
    });

    await act(async () => {
      await useSettingsStore.getState().initialize();
    });

    const reloaded = useSettingsStore.getState();
    expect(reloaded.providers.openrouter.selectedModel).toBe(customModel);
    expect(reloaded.activeProvider).toBe('openrouter');
  });

  it('uses anti-purple default params and persists sensory template config', async () => {
    const initial = useSettingsStore.getState();
    expect(initial.providerDefaults.nim.topP).toBe(0.85);
    expect(initial.providerDefaults.nim.topK).toBe(40);
    expect(initial.providerDefaults.nim.frequencyPenalty).toBe(0.5);
    expect(initial.providerDefaults.nim.presencePenalty).toBe(0.2);

    const nextTemplates = [
      { id: 'sensory_a', name: 'A', content: 'cold + sticky + breath', tags: [] },
      { id: 'sensory_b', name: 'B', content: 'metal scrape + shallow breath', tags: [] },
    ];
    await act(async () => {
      await useSettingsStore.getState().applySettingsSnapshot({
        activeProvider: initial.activeProvider,
        providers: initial.providers,
        phaseConfig: initial.phaseConfig,
        providerDefaults: initial.providerDefaults,
        modelOverrides: initial.modelOverrides,
        customPrompts: initial.customPrompts,
        sensoryAnchorTemplates: nextTemplates,
        sensoryAutoTemplateByPhase: {
          chapter1: 'sensory_b',
          continuation: 'sensory_a',
        },
        context: {
          truncationThreshold: initial.truncationThreshold,
          dualEndBuffer: initial.dualEndBuffer,
          compressionMode: initial.compressionMode,
          compressionAutoThreshold: initial.compressionAutoThreshold,
          compressionChunkSize: initial.compressionChunkSize,
          compressionChunkOverlap: initial.compressionChunkOverlap,
          compressionEvidenceSegments: initial.compressionEvidenceSegments,
          autoResumeOnLength: initial.autoResumeOnLength,
          autoResumePhaseAnalysis: initial.autoResumePhaseAnalysis,
          autoResumePhaseOutline: initial.autoResumePhaseOutline,
          autoResumeMaxRounds: initial.autoResumeMaxRounds,
        },
      });
    });

    const state = useSettingsStore.getState();
    expect(state.sensoryAnchorTemplates).toEqual(nextTemplates);
    expect(state.sensoryAutoTemplateByPhase.chapter1).toBe('sensory_b');
    expect(state.sensoryAutoTemplateByPhase.continuation).toBe('sensory_a');
  });

  it('adds harvested sensory templates with dedupe', async () => {
    const before = useSettingsStore.getState();
    const initialCount = before.sensoryAnchorTemplates.length;

    await act(async () => {
      await useSettingsStore.getState().addSensoryTemplatesFromHarvest([
        {
          id: 'h1',
          text: 'Cold slime coated her thigh and dripped slowly.',
          tags: ['cold', 'slime'],
          sensoryScore: 0.9,
          controlLossScore: 0.8,
          source: 'uploaded_novel',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'h2',
          text: 'Cold slime coated her thigh and dripped slowly.',
          tags: ['dup'],
          sensoryScore: 0.4,
          controlLossScore: 0.4,
          source: 'uploaded_novel',
          createdAt: new Date().toISOString(),
        },
      ]);
    });

    const after = useSettingsStore.getState();
    expect(after.sensoryAnchorTemplates.length).toBe(initialCount + 1);
    const added = after.sensoryAnchorTemplates.find((entry) => entry.content === 'Cold slime coated her thigh and dripped slowly.');
    expect(added).toBeDefined();
    expect(added?.name.startsWith('收割-')).toBe(true);
    expect(added?.tags?.every((tag) => /[\u3400-\u9FFF]/.test(tag))).toBe(true);
  });

  it('initialize is idempotent across concurrent calls', async () => {
    const getSettingsSpy = vi.spyOn(dbModule, 'getSettings').mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return undefined;
    });

    await act(async () => {
      await Promise.all([
        useSettingsStore.getState().initialize(),
        useSettingsStore.getState().initialize(),
        useSettingsStore.getState().initialize(),
      ]);
    });

    expect(getSettingsSpy).toHaveBeenCalledTimes(1);
    expect(useSettingsStore.getState().isInitialized).toBe(true);
    getSettingsSpy.mockRestore();
  });

  it('ensurePhaseMetadata syncs model token metadata for lore extractor phase', async () => {
    await act(async () => {
      await useSettingsStore.getState().setProviderApiKey('openrouter', 'or-key');
      await useSettingsStore.getState().setPhaseSelection('loreExtractor', {
        provider: 'openrouter',
        model: 'qwen/qwen3-235b-a22b',
      });
    });

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'qwen/qwen3-235b-a22b',
            supportedParameters: ['temperature', 'top_p'],
            contextLength: 262144,
            maxCompletionTokens: 8192,
          },
        ],
      }),
    } as Response);

    let result: { synced: boolean; provider: string; model: string; reason?: string } | null = null;
    await act(async () => {
      result = await useSettingsStore.getState().ensurePhaseMetadata('loreExtractor');
    });

    expect(result).toEqual(
      expect.objectContaining({
        synced: true,
        provider: 'openrouter',
        model: 'qwen/qwen3-235b-a22b',
      })
    );

    const resolved = useSettingsStore.getState().getResolvedGenerationConfig('loreExtractor');
    expect(resolved.maxContextTokens).toBe(262144);
    expect(resolved.maxCompletionTokens).toBe(8192);
    expect(resolved.supportedParameters).toContain('temperature');

    fetchSpy.mockRestore();
  });
});
