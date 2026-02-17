import { create } from 'zustand';
import { saveSettings, getSettings } from '@/lib/db';
import {
  fetchModelCapabilityByProvider,
  fetchModelsByProvider,
} from '@/lib/nim-client';
import type {
  GenerationParams,
  LLMProvider,
  ModelCapability,
  PhaseConfigMap,
  PhaseModelSelection,
  ProviderScopedSettings,
} from '@/lib/llm-types';
import type { WorkflowStepId } from '@/store/useWorkflowStore';
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

const DEFAULT_NIM_MODEL = 'meta/llama3-70b-instruct';
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini';
const DEFAULT_PHASES: WorkflowStepId[] = [
  'compression',
  'analysis',
  'outline',
  'breakdown',
  'chapter1',
  'continuation',
];

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

function sanitizeResumeRounds(value: number, fallback: number): number {
  const normalized = sanitizePositiveInt(value, fallback);
  return Math.max(1, Math.min(4, normalized));
}

function createDefaultProviderSettings(): Record<LLMProvider, ProviderScopedSettings> {
  return {
    nim: {
      apiKey: '',
      selectedModel: DEFAULT_NIM_MODEL,
      recentModels: [],
      modelCapabilities: {},
      modelParameterSupport: {},
      modelTokenLimits: {},
    },
    openrouter: {
      apiKey: '',
      selectedModel: DEFAULT_OPENROUTER_MODEL,
      recentModels: [],
      modelCapabilities: {},
      modelParameterSupport: {},
      modelTokenLimits: {},
    },
  };
}

function ensureProviderSelectedModel(
  provider: LLMProvider,
  providerState: ProviderScopedSettings
): ProviderScopedSettings {
  const fallback = provider === 'nim' ? DEFAULT_NIM_MODEL : DEFAULT_OPENROUTER_MODEL;
  const selectedModel = providerState.selectedModel?.trim() || fallback;
  return {
    ...providerState,
    selectedModel,
    modelTokenLimits: providerState.modelTokenLimits || {},
  };
}

function createDefaultProviderDefaults(): Record<LLMProvider, GenerationParams> {
  return {
    nim: {
      maxTokens: 4096,
      autoMaxTokens: false,
      temperature: 0.7,
      topP: 1,
      thinkingEnabled: false,
    },
    openrouter: {
      maxTokens: 4096,
      autoMaxTokens: false,
      temperature: 0.7,
      topP: 1,
      thinkingEnabled: false,
    },
  };
}

function createDefaultPhaseConfig(): PhaseConfigMap {
  return {
    compression: { provider: 'nim', model: DEFAULT_NIM_MODEL },
    analysis: { provider: 'nim', model: DEFAULT_NIM_MODEL },
    outline: { provider: 'nim', model: DEFAULT_NIM_MODEL },
    breakdown: { provider: 'nim', model: DEFAULT_NIM_MODEL },
    chapter1: { provider: 'nim', model: DEFAULT_NIM_MODEL },
    continuation: { provider: 'nim', model: DEFAULT_NIM_MODEL },
  };
}

function normalizeGenerationParams(
  params: Partial<GenerationParams> | undefined,
  fallback: GenerationParams
): GenerationParams {
  return {
    ...fallback,
    ...params,
    maxTokens: sanitizePositiveInt(params?.maxTokens ?? fallback.maxTokens, fallback.maxTokens),
    autoMaxTokens: Boolean(params?.autoMaxTokens),
    temperature: Number.isFinite(params?.temperature) ? Number(params?.temperature) : fallback.temperature,
    topP: Number.isFinite(params?.topP) ? Number(params?.topP) : fallback.topP,
  };
}

function resolveCompatibilityFields(state: Pick<
  SettingsState,
  'activeProvider' | 'providers' | 'providerDefaults'
>) {
  const active = state.providers[state.activeProvider];
  const defaults = state.providerDefaults[state.activeProvider];
  return {
    apiKey: active.apiKey,
    selectedModel: active.selectedModel,
    recentModels: active.recentModels,
    modelCapabilities: active.modelCapabilities,
    thinkingEnabled: defaults.thinkingEnabled,
  };
}

interface SettingsState {
  activeProvider: LLMProvider;
  providers: Record<LLMProvider, ProviderScopedSettings>;
  phaseConfig: PhaseConfigMap;
  providerDefaults: Record<LLMProvider, GenerationParams>;
  modelOverrides: Record<LLMProvider, Record<string, Partial<GenerationParams>>>;

  // Legacy compatibility projections for existing components.
  apiKey: string;
  selectedModel: string;
  recentModels: string[];
  thinkingEnabled: boolean;
  modelCapabilities: Record<string, ModelCapability>;

  customPrompts: Record<string, string>;
  truncationThreshold: number;
  dualEndBuffer: number;
  compressionMode: CompressionMode;
  compressionAutoThreshold: number;
  compressionChunkSize: number;
  compressionChunkOverlap: number;
  compressionEvidenceSegments: number;
  autoResumeOnLength: boolean;
  autoResumePhaseAnalysis: boolean;
  autoResumePhaseOutline: boolean;
  autoResumeMaxRounds: number;
  persistCount: number;
  lastPersistDurationMs?: number;
  lastPersistAt?: number;

  applySettingsSnapshot: (snapshot: {
    activeProvider: LLMProvider;
    providers: Record<LLMProvider, ProviderScopedSettings>;
    phaseConfig: PhaseConfigMap;
    providerDefaults: Record<LLMProvider, GenerationParams>;
    modelOverrides: Record<LLMProvider, Record<string, Partial<GenerationParams>>>;
    customPrompts: Record<string, string>;
    context: Pick<
      SettingsState,
      | 'truncationThreshold'
      | 'dualEndBuffer'
      | 'compressionMode'
      | 'compressionAutoThreshold'
      | 'compressionChunkSize'
      | 'compressionChunkOverlap'
      | 'compressionEvidenceSegments'
      | 'autoResumeOnLength'
      | 'autoResumePhaseAnalysis'
      | 'autoResumePhaseOutline'
      | 'autoResumeMaxRounds'
    >;
  }) => Promise<void>;

  setActiveProvider: (provider: LLMProvider) => Promise<void>;
  setProviderApiKey: (provider: LLMProvider, key: string) => Promise<void>;
  setProviderSelectedModel: (provider: LLMProvider, model: string) => Promise<void>;
  setPhaseSelection: (phaseId: WorkflowStepId, selection: PhaseModelSelection) => Promise<void>;
  setProviderDefaultParams: (provider: LLMProvider, params: Partial<GenerationParams>) => Promise<void>;
  setModelOverrideParams: (provider: LLMProvider, model: string, params: Partial<GenerationParams>) => Promise<void>;
  clearModelOverrideParams: (provider: LLMProvider, model: string) => Promise<void>;
  getResolvedGenerationConfig: (phaseId: WorkflowStepId) => {
    provider: LLMProvider;
    model: string;
    apiKey: string;
    params: GenerationParams;
    capability?: ModelCapability;
    supportedParameters: string[];
    maxContextTokens?: number;
    maxCompletionTokens?: number;
  };
  getActiveApiKey: () => string;

  // Legacy actions kept for compatibility with existing code.
  setApiKey: (key: string) => Promise<void>;
  setSelectedModel: (model: string) => Promise<void>;
  addRecentModel: (model: string, provider?: LLMProvider) => Promise<void>;
  setCustomPrompt: (key: string, prompt: string) => Promise<void>;
  setThinkingEnabled: (enabled: boolean, provider?: LLMProvider) => Promise<void>;
  upsertModelCapability: (model: string, capability: ModelCapability, provider?: LLMProvider) => Promise<void>;
  probeModelCapability: (model: string, apiKey?: string, provider?: LLMProvider) => Promise<ModelCapability>;
  fetchProviderModels: (provider: LLMProvider, apiKey?: string) => Promise<string[]>;
  updateContextSettings: (settings: Partial<Pick<
    SettingsState,
    | 'truncationThreshold'
    | 'dualEndBuffer'
    | 'compressionMode'
    | 'compressionAutoThreshold'
    | 'compressionChunkSize'
    | 'compressionChunkOverlap'
    | 'compressionEvidenceSegments'
    | 'autoResumeOnLength'
    | 'autoResumePhaseAnalysis'
    | 'autoResumePhaseOutline'
    | 'autoResumeMaxRounds'
  >>) => Promise<void>;
  resetPrompt: (key: string) => Promise<void>;
  initialize: () => Promise<void>;
  persist: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  activeProvider: 'nim',
  providers: createDefaultProviderSettings(),
  phaseConfig: createDefaultPhaseConfig(),
  providerDefaults: createDefaultProviderDefaults(),
  modelOverrides: { nim: {}, openrouter: {} },

  apiKey: '',
  selectedModel: DEFAULT_NIM_MODEL,
  recentModels: [],
  thinkingEnabled: false,
  modelCapabilities: {},

  customPrompts: {},
  truncationThreshold: 799,
  dualEndBuffer: 500,
  compressionMode: DEFAULT_COMPRESSION_MODE,
  compressionAutoThreshold: DEFAULT_COMPRESSION_AUTO_THRESHOLD,
  compressionChunkSize: DEFAULT_COMPRESSION_CHUNK_SIZE,
  compressionChunkOverlap: DEFAULT_COMPRESSION_CHUNK_OVERLAP,
  compressionEvidenceSegments: DEFAULT_COMPRESSION_EVIDENCE_SEGMENTS,
  autoResumeOnLength: true,
  autoResumePhaseAnalysis: true,
  autoResumePhaseOutline: true,
  autoResumeMaxRounds: 2,
  persistCount: 0,
  lastPersistDurationMs: undefined,
  lastPersistAt: undefined,

  setActiveProvider: async (provider) => {
    set((state) => {
      const next = { ...state, activeProvider: provider };
      return { ...next, ...resolveCompatibilityFields(next) };
    });
    await get().persist();
  },

  applySettingsSnapshot: async (snapshot) => {
    set((state) => {
      const defaultProviderDefaults = createDefaultProviderDefaults();
      const normalizedProviderDefaults: Record<LLMProvider, GenerationParams> = {
        nim: normalizeGenerationParams(snapshot.providerDefaults.nim, defaultProviderDefaults.nim),
        openrouter: normalizeGenerationParams(snapshot.providerDefaults.openrouter, defaultProviderDefaults.openrouter),
      };
      const normalizedProviders: Record<LLMProvider, ProviderScopedSettings> = {
        nim: {
          ...ensureProviderSelectedModel('nim', snapshot.providers.nim),
          recentModels: [
            ...new Set([
              ensureProviderSelectedModel('nim', snapshot.providers.nim).selectedModel,
              ...(snapshot.providers.nim.recentModels || []),
            ].filter(Boolean)),
          ].slice(0, 24),
        },
        openrouter: {
          ...ensureProviderSelectedModel('openrouter', snapshot.providers.openrouter),
          recentModels: [
            ...new Set([
              ensureProviderSelectedModel('openrouter', snapshot.providers.openrouter).selectedModel,
              ...(snapshot.providers.openrouter.recentModels || []),
            ].filter(Boolean)),
          ].slice(0, 24),
        },
      };

      const next = {
        ...state,
        activeProvider: snapshot.activeProvider,
        providers: normalizedProviders,
        phaseConfig: snapshot.phaseConfig,
        providerDefaults: normalizedProviderDefaults,
        modelOverrides: snapshot.modelOverrides,
        customPrompts: snapshot.customPrompts,
        truncationThreshold: sanitizePositiveInt(snapshot.context.truncationThreshold, state.truncationThreshold),
        dualEndBuffer: sanitizePositiveInt(snapshot.context.dualEndBuffer, state.dualEndBuffer),
        compressionMode: snapshot.context.compressionMode,
        compressionAutoThreshold: sanitizePositiveInt(snapshot.context.compressionAutoThreshold, state.compressionAutoThreshold),
        compressionChunkSize: sanitizePositiveInt(snapshot.context.compressionChunkSize, state.compressionChunkSize),
        compressionChunkOverlap: Math.max(
          0,
          sanitizePositiveInt(snapshot.context.compressionChunkOverlap, state.compressionChunkOverlap)
        ),
        compressionEvidenceSegments: Math.max(
          4,
          Math.min(16, sanitizePositiveInt(snapshot.context.compressionEvidenceSegments, state.compressionEvidenceSegments))
        ),
        autoResumeOnLength: snapshot.context.autoResumeOnLength ?? state.autoResumeOnLength,
        autoResumePhaseAnalysis: snapshot.context.autoResumePhaseAnalysis ?? state.autoResumePhaseAnalysis,
        autoResumePhaseOutline: snapshot.context.autoResumePhaseOutline ?? state.autoResumePhaseOutline,
        autoResumeMaxRounds: sanitizeResumeRounds(
          snapshot.context.autoResumeMaxRounds,
          state.autoResumeMaxRounds
        ),
      };
      return { ...next, ...resolveCompatibilityFields(next) };
    });

    await get().persist();
  },

  setProviderApiKey: async (provider, key) => {
    set((state) => {
      const providers = {
        ...state.providers,
        [provider]: { ...state.providers[provider], apiKey: key },
      };
      const next = { ...state, providers };
      return { ...next, ...resolveCompatibilityFields(next) };
    });
    await get().persist();
  },

  setProviderSelectedModel: async (provider, model) => {
    await get().addRecentModel(model, provider);
    set((state) => {
      const providers = {
        ...state.providers,
        [provider]: {
          ...state.providers[provider],
          selectedModel: model,
        },
      };
      const next = { ...state, providers };
      return { ...next, ...resolveCompatibilityFields(next) };
    });
    await get().persist();

    const capability = get().providers[provider].modelCapabilities[model];
    if (isCapabilityFresh(capability)) {
      return;
    }
    void get().probeModelCapability(model, undefined, provider);
  },

  setPhaseSelection: async (phaseId, selection) => {
    set((state) => ({
      phaseConfig: {
        ...state.phaseConfig,
        [phaseId]: selection,
      },
    }));
    await get().persist();
  },

  setProviderDefaultParams: async (provider, params) => {
    set((state) => ({
      providerDefaults: {
        ...state.providerDefaults,
        [provider]: normalizeGenerationParams(
          {
            ...state.providerDefaults[provider],
            ...params,
          },
          createDefaultProviderDefaults()[provider]
        ),
      },
      ...(provider === state.activeProvider
        ? { thinkingEnabled: params.thinkingEnabled ?? state.thinkingEnabled }
        : {}),
    }));
    await get().persist();
  },

  setModelOverrideParams: async (provider, model, params) => {
    set((state) => ({
      modelOverrides: {
        ...state.modelOverrides,
        [provider]: {
          ...state.modelOverrides[provider],
          [model]: {
            ...(state.modelOverrides[provider]?.[model] || {}),
            ...params,
          },
        },
      },
    }));
    await get().persist();
  },

  clearModelOverrideParams: async (provider, model) => {
    set((state) => {
      const providerOverrides = { ...(state.modelOverrides[provider] || {}) };
      delete providerOverrides[model];
      return {
        modelOverrides: {
          ...state.modelOverrides,
          [provider]: providerOverrides,
        },
      };
    });
    await get().persist();
  },

  getResolvedGenerationConfig: (phaseId) => {
    const state = get();
    const phaseSelection = state.phaseConfig[phaseId];
    const provider = phaseSelection?.provider ?? state.activeProvider;
    const scoped = state.providers[provider];
    const model = phaseSelection?.model || scoped.selectedModel;
    const defaults = state.providerDefaults[provider];
    const override = state.modelOverrides[provider]?.[model] || {};
    return {
      provider,
      model,
      apiKey: scoped.apiKey,
      params: { ...defaults, ...override },
      capability: scoped.modelCapabilities[model],
      supportedParameters: scoped.modelParameterSupport[model] || [],
      maxContextTokens: scoped.modelTokenLimits?.[model]?.contextLength,
      maxCompletionTokens: scoped.modelTokenLimits?.[model]?.maxCompletionTokens,
    };
  },

  getActiveApiKey: () => {
    const state = get();
    return state.providers[state.activeProvider].apiKey;
  },

  setApiKey: async (key) => {
    await get().setProviderApiKey(get().activeProvider, key);
  },

  setSelectedModel: async (model) => {
    await get().setProviderSelectedModel(get().activeProvider, model);
  },

  addRecentModel: async (model, provider) => {
    const targetProvider = provider ?? get().activeProvider;
    set((state) => {
      const providerState = state.providers[targetProvider];
      const newRecent = [model, ...providerState.recentModels.filter((m) => m !== model)].slice(0, 8);
      const providers = {
        ...state.providers,
        [targetProvider]: {
          ...providerState,
          recentModels: newRecent,
        },
      };
      const next = { ...state, providers };
      return { ...next, ...resolveCompatibilityFields(next) };
    });
    await get().persist();
  },

  setCustomPrompt: async (key, prompt) => {
    const { customPrompts } = get();
    set({ customPrompts: { ...customPrompts, [key]: prompt } });
    await get().persist();
  },

  setThinkingEnabled: async (enabled, provider) => {
    const targetProvider = provider ?? get().activeProvider;
    await get().setProviderDefaultParams(targetProvider, { thinkingEnabled: enabled });
  },

  upsertModelCapability: async (model, capability, provider) => {
    const targetProvider = provider ?? get().activeProvider;
    set((state) => {
      const providerState = state.providers[targetProvider];
      const providers = {
        ...state.providers,
        [targetProvider]: {
          ...providerState,
          modelCapabilities: {
            ...providerState.modelCapabilities,
            [model]: capability,
          },
        },
      };
      const next = { ...state, providers };
      return { ...next, ...resolveCompatibilityFields(next) };
    });
    await get().persist();
  },

  probeModelCapability: async (model, apiKeyOverride, provider) => {
    const targetProvider = provider ?? get().activeProvider;
    const state = get();
    const providerState = state.providers[targetProvider];
    const override = targetProvider === 'nim' ? getModelCapabilityOverride(model) : undefined;
    const resolvedApiKey = apiKeyOverride ?? providerState.apiKey;
    const existing = providerState.modelCapabilities[model];

    try {
      const capability = await fetchModelCapabilityByProvider(targetProvider, model, resolvedApiKey);
      if (
        capability.thinkingSupported === 'unknown' &&
        isRateLimitReason(capability.reason) &&
        existing
      ) {
        return existing;
      }
      await get().upsertModelCapability(model, capability, targetProvider);
      return capability;
    } catch (error) {
      if (override) {
        await get().upsertModelCapability(model, override, targetProvider);
        return override;
      }
      if (existing) {
        return existing;
      }
      const fallback: ModelCapability = {
        chatSupported: true,
        thinkingSupported: 'unknown',
        reason: error instanceof Error ? error.message : 'Capability probe failed',
        checkedAt: Date.now(),
        source: 'probe',
      };
      await get().upsertModelCapability(model, fallback, targetProvider);
      return fallback;
    }
  },

  fetchProviderModels: async (provider, apiKey) => {
    const models = await fetchModelsByProvider(provider, apiKey ?? get().providers[provider].apiKey);
    const ids = models.map((entry) => entry.id);
    const supportMap = Object.fromEntries(
      models.map((entry) => [entry.id, entry.supportedParameters ?? []])
    ) as Record<string, string[]>;
    const tokenLimitMap = Object.fromEntries(
      models.map((entry) => [entry.id, {
        contextLength: entry.contextLength,
        maxCompletionTokens: entry.maxCompletionTokens,
      }])
    ) as Record<string, { contextLength?: number; maxCompletionTokens?: number }>;

    set((state) => {
      const providerState = state.providers[provider];
      const providers = {
        ...state.providers,
        [provider]: {
          ...providerState,
          modelParameterSupport: {
            ...providerState.modelParameterSupport,
            ...supportMap,
          },
          modelTokenLimits: {
            ...providerState.modelTokenLimits,
            ...tokenLimitMap,
          },
          recentModels: [...new Set([...ids, ...providerState.recentModels])].slice(0, 24),
        },
      };
      const next = { ...state, providers };
      return { ...next, ...resolveCompatibilityFields(next) };
    });
    await get().persist();
    return ids;
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
      autoResumeOnLength: settings.autoResumeOnLength ?? state.autoResumeOnLength,
      autoResumePhaseAnalysis: settings.autoResumePhaseAnalysis ?? state.autoResumePhaseAnalysis,
      autoResumePhaseOutline: settings.autoResumePhaseOutline ?? state.autoResumePhaseOutline,
      autoResumeMaxRounds: settings.autoResumeMaxRounds === undefined
        ? state.autoResumeMaxRounds
        : sanitizeResumeRounds(settings.autoResumeMaxRounds, state.autoResumeMaxRounds),
    }));
    await get().persist();
  },

  resetPrompt: async (key) => {
    const { customPrompts } = get();
    const next = { ...customPrompts };
    delete next[key];
    set({ customPrompts: next });
    await get().persist();
  },

  initialize: async () => {
    const settings = await getSettings();
    if (!settings) {
      return;
    }

    const providersRaw = settings.providers ?? createDefaultProviderSettings();
    const providers: Record<LLMProvider, ProviderScopedSettings> = {
      nim: ensureProviderSelectedModel('nim', providersRaw.nim),
      openrouter: ensureProviderSelectedModel('openrouter', providersRaw.openrouter),
    };
    const activeProvider = settings.activeProvider ?? 'nim';
    const defaultProviderDefaults = createDefaultProviderDefaults();
    const providerDefaultsRaw = settings.providerDefaults ?? defaultProviderDefaults;
    const providerDefaults: Record<LLMProvider, GenerationParams> = {
      nim: normalizeGenerationParams(providerDefaultsRaw.nim, defaultProviderDefaults.nim),
      openrouter: normalizeGenerationParams(providerDefaultsRaw.openrouter, defaultProviderDefaults.openrouter),
    };
    const modelOverrides = settings.modelOverrides ?? { nim: {}, openrouter: {} };
    const phaseConfig = { ...createDefaultPhaseConfig(), ...(settings.phaseConfig || {}) };

    // Backfill legacy values into nim provider when needed.
    if (!settings.providers) {
      providers.nim = {
        ...providers.nim,
        apiKey: settings.apiKey || providers.nim.apiKey,
        selectedModel: settings.selectedModel || providers.nim.selectedModel,
        recentModels: settings.recentModels || providers.nim.recentModels,
        modelCapabilities: settings.modelCapabilities || providers.nim.modelCapabilities,
      };
      providerDefaults.nim = {
        ...providerDefaults.nim,
        thinkingEnabled: settings.thinkingEnabled ?? providerDefaults.nim.thinkingEnabled,
      };
    }

    if (!settings.phaseConfig) {
      for (const phaseId of DEFAULT_PHASES) {
        phaseConfig[phaseId] = {
          provider: 'nim',
          model: providers.nim.selectedModel || DEFAULT_NIM_MODEL,
        };
      }
    } else {
      for (const phaseId of DEFAULT_PHASES) {
        const selection = phaseConfig[phaseId];
        const provider = selection?.provider ?? 'nim';
        const fallbackModel = providers[provider].selectedModel;
        phaseConfig[phaseId] = {
          provider,
          model: selection?.model?.trim() || fallbackModel,
        };
      }
    }

    const nextPartial = {
      activeProvider,
      providers,
      providerDefaults,
      modelOverrides,
      phaseConfig,
      customPrompts: settings.customPrompts || {},
      truncationThreshold: settings.truncationThreshold ?? 799,
      dualEndBuffer: settings.dualEndBuffer ?? 500,
      compressionMode: settings.compressionMode ?? DEFAULT_COMPRESSION_MODE,
      compressionAutoThreshold: settings.compressionAutoThreshold ?? DEFAULT_COMPRESSION_AUTO_THRESHOLD,
      compressionChunkSize: settings.compressionChunkSize ?? DEFAULT_COMPRESSION_CHUNK_SIZE,
      compressionChunkOverlap: settings.compressionChunkOverlap ?? DEFAULT_COMPRESSION_CHUNK_OVERLAP,
      compressionEvidenceSegments: settings.compressionEvidenceSegments ?? DEFAULT_COMPRESSION_EVIDENCE_SEGMENTS,
      autoResumeOnLength: settings.autoResumeOnLength ?? true,
      autoResumePhaseAnalysis: settings.autoResumePhaseAnalysis ?? true,
      autoResumePhaseOutline: settings.autoResumePhaseOutline ?? true,
      autoResumeMaxRounds: sanitizeResumeRounds(settings.autoResumeMaxRounds ?? 2, 2),
    };
    set((state) => {
      const merged = { ...state, ...nextPartial };
      return { ...merged, ...resolveCompatibilityFields(merged) };
    });
  },

  persist: async () => {
    const now = () =>
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const startedAt = now();
    const state = get();
    await saveSettings({
      // Legacy fields preserved for compatibility with older code snapshots.
      apiKey: state.providers.nim.apiKey,
      selectedModel: state.providers.nim.selectedModel,
      recentModels: state.providers.nim.recentModels,
      modelCapabilities: state.providers.nim.modelCapabilities,
      thinkingEnabled: state.providerDefaults.nim.thinkingEnabled,

      activeProvider: state.activeProvider,
      providers: state.providers,
      providerDefaults: state.providerDefaults,
      modelOverrides: state.modelOverrides,
      phaseConfig: state.phaseConfig,

      customPrompts: state.customPrompts,
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
    });
    const duration = now() - startedAt;
    set((nextState) => ({
      persistCount: nextState.persistCount + 1,
      lastPersistDurationMs: duration,
      lastPersistAt: Date.now(),
    }));
  },
}));
