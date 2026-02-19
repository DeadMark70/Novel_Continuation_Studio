'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DEFAULT_PROMPTS } from '@/lib/prompts';
import type {
  GenerationPhaseId,
  GenerationParams,
  LLMProvider,
  PhaseConfigMap,
  ProviderScopedSettings,
  SensoryAnchorTemplate,
} from '@/lib/llm-types';
import type { CompressionMode } from '@/lib/compression';

type PromptKey = keyof typeof DEFAULT_PROMPTS;

const PROVIDERS: LLMProvider[] = ['nim', 'openrouter'];
const PHASES: GenerationPhaseId[] = ['compression', 'analysis', 'outline', 'breakdown', 'chapter1', 'continuation', 'sensoryHarvest'];
const PHASE_LABELS: Record<GenerationPhaseId, string> = {
  compression: 'Phase 0 Compression',
  analysis: 'Phase 1 Analysis',
  outline: 'Phase 2 Outline',
  breakdown: 'Phase 3 Breakdown',
  chapter1: 'Phase 4 Chapter 1',
  continuation: 'Phase 5 Continuation',
  sensoryHarvest: 'Sensory Template Harvest',
};
const PROMPT_KEYS = Object.keys(DEFAULT_PROMPTS) as PromptKey[];
const PROMPT_GROUPS: Array<{ title: string; keys: PromptKey[] }> = [
  { title: 'Workflow Core', keys: ['analysisCompressed', 'analysisRaw', 'outlineCompressed', 'outlineRaw', 'breakdown', 'chapter1Compressed', 'chapter1Raw', 'continuationCompressed', 'continuationRaw'] },
  { title: 'Compression Pipeline', keys: ['compression', 'compressionRoleCards', 'compressionStyleGuide', 'compressionPlotLedger', 'compressionEvidencePack', 'compressionEroticPack'] },
  { title: 'Consistency', keys: ['consistency'] },
];
const PROMPT_LABELS: Partial<Record<PromptKey, string>> = {
  analysisCompressed: 'Analysis (Compressed)',
  analysisRaw: 'Analysis (Raw)',
  compression: 'Compression Orchestrator',
  compressionRoleCards: 'Compression Role Cards',
  compressionStyleGuide: 'Compression Style Guide',
  compressionPlotLedger: 'Compression Plot Ledger',
  compressionEvidencePack: 'Compression Evidence Pack',
  compressionEroticPack: 'Compression Erotic Pack',
  outlineCompressed: 'Outline (Compressed)',
  outlineRaw: 'Outline (Raw)',
  breakdown: 'Chapter Breakdown',
  chapter1Compressed: 'Chapter 1 (Compressed)',
  chapter1Raw: 'Chapter 1 (Raw)',
  continuationCompressed: 'Continuation (Compressed)',
  continuationRaw: 'Continuation (Raw)',
  consistency: 'Consistency Check',
};
const PROMPT_DESCRIPTIONS: Partial<Record<PromptKey, string>> = {
  analysisCompressed: 'Phase 1 analysis using compressed context.',
  analysisRaw: 'Phase 1 analysis using original novel context.',
  compression: 'Coordinates Phase 0 compression pipeline.',
  compressionRoleCards: 'Extract character cards for compressed memory.',
  compressionStyleGuide: 'Extract style profile for writing consistency.',
  compressionPlotLedger: 'Extract plot ledger summary for continuity.',
  compressionEvidencePack: 'Extract factual evidence pack for grounding.',
  compressionEroticPack: 'Extract adult-theme style, dynamics, and reusable erotic evidence.',
  outlineCompressed: 'Generate outline with compressed context.',
  outlineRaw: 'Generate outline with full raw context.',
  breakdown: 'Convert outline into chapter-level framework.',
  chapter1Compressed: 'Generate chapter 1 with compressed context.',
  chapter1Raw: 'Generate chapter 1 with raw context.',
  continuationCompressed: 'Generate continuation chapter using compressed context.',
  continuationRaw: 'Generate continuation chapter using raw context.',
  consistency: 'Run consistency checks for timeline and character logic.',
};
const FALLBACK_PHASE_PROVIDER: LLMProvider = 'nim';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function humanizePromptKey(key: PromptKey): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (s) => s.toUpperCase());
}

function getPromptLabel(key: PromptKey): string {
  return PROMPT_LABELS[key] ?? humanizePromptKey(key);
}

function getPromptDescription(key: PromptKey): string {
  return PROMPT_DESCRIPTIONS[key] ?? `Prompt template: ${key}`;
}

function normalizeParams(params: GenerationParams): GenerationParams {
  return {
    maxTokens: Math.max(1, Math.floor(params.maxTokens || 4096)),
    autoMaxTokens: Boolean(params.autoMaxTokens),
    temperature: Number.isFinite(params.temperature) ? params.temperature : 0.7,
    topP: Number.isFinite(params.topP) ? params.topP : 0.85,
    topK: params.topK,
    frequencyPenalty: params.frequencyPenalty,
    presencePenalty: params.presencePenalty,
    seed: params.seed,
    thinkingEnabled: Boolean(params.thinkingEnabled),
    thinkingBudget: params.thinkingBudget,
  };
}

function getParamValidationMessage(
  param: 'maxTokens' | 'temperature' | 'topP' | 'topK',
  value: number | undefined,
  options?: { autoMaxTokens?: boolean }
): string {
  if (value === undefined || Number.isNaN(value)) return '';
  if (param === 'maxTokens') {
    if (options?.autoMaxTokens) {
      return '';
    }
    return value < 1 ? 'Must be >= 1.' : '';
  }
  if (param === 'temperature') {
    return value < 0 || value > 2 ? 'Must be between 0 and 2.' : '';
  }
  if (param === 'topP') {
    return value < 0 || value > 1 ? 'Must be between 0 and 1.' : '';
  }
  if (param === 'topK') {
    return value < 1 ? 'Must be >= 1.' : '';
  }
  return '';
}

function parseRequiredIntInput(raw: string, current: number): number {
  if (raw.trim() === '') {
    return current;
  }
  const next = Number.parseInt(raw, 10);
  return Number.isFinite(next) ? next : current;
}

function parseRequiredFloatInput(raw: string, current: number): number {
  if (raw.trim() === '') {
    return current;
  }
  const next = Number.parseFloat(raw);
  return Number.isFinite(next) ? next : current;
}

function createTemplateId(): string {
  return `sensory_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function SettingsPage() {
  const router = useRouter();
  const settings = useSettingsStore(
    useShallow((state) => ({
      activeProvider: state.activeProvider,
      providers: state.providers,
      phaseConfig: state.phaseConfig,
      providerDefaults: state.providerDefaults,
      modelOverrides: state.modelOverrides,
      customPrompts: state.customPrompts,
      sensoryAnchorTemplates: state.sensoryAnchorTemplates,
      sensoryAutoTemplateByPhase: state.sensoryAutoTemplateByPhase,
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
      persistCount: state.persistCount,
      lastPersistDurationMs: state.lastPersistDurationMs,
      lastPersistAt: state.lastPersistAt,
      fetchProviderModels: state.fetchProviderModels,
      applySettingsSnapshot: state.applySettingsSnapshot,
      getResolvedGenerationConfig: state.getResolvedGenerationConfig,
    }))
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [lastSaveDurationMs, setLastSaveDurationMs] = useState<number | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [promptSearch, setPromptSearch] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptKey>('analysisCompressed');
  const [overrideProvider, setOverrideProvider] = useState<LLMProvider>('nim');
  const [overrideModel, setOverrideModel] = useState('');
  const [allowCustomModelId, setAllowCustomModelId] = useState(true);
  const [loadingModels, setLoadingModels] = useState<Record<LLMProvider, boolean>>({ nim: false, openrouter: false });

  const [draftProvider, setDraftProvider] = useState<LLMProvider>(settings.activeProvider);
  const [draftProviders, setDraftProviders] = useState<Record<LLMProvider, ProviderScopedSettings>>(
    () => clone(settings.providers)
  );
  const [draftPhaseConfig, setDraftPhaseConfig] = useState<PhaseConfigMap>(() =>
    clone(settings.phaseConfig)
  );
  const [draftDefaults, setDraftDefaults] = useState<Record<LLMProvider, GenerationParams>>(
    () => clone(settings.providerDefaults)
  );
  const [draftOverrides, setDraftOverrides] = useState<Record<LLMProvider, Record<string, Partial<GenerationParams>>>>(
    () => clone(settings.modelOverrides)
  );
  const [draftPrompts, setDraftPrompts] = useState<Record<string, string>>(() =>
    clone(settings.customPrompts)
  );
  const [draftSensoryTemplates, setDraftSensoryTemplates] = useState<SensoryAnchorTemplate[]>(() =>
    clone(settings.sensoryAnchorTemplates)
  );
  const [draftSensoryAutoTemplateByPhase, setDraftSensoryAutoTemplateByPhase] = useState<{
    chapter1?: string;
    continuation?: string;
  }>(() => clone(settings.sensoryAutoTemplateByPhase));
  const [draftContext, setDraftContext] = useState<{
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
  }>(() => ({
    truncationThreshold: settings.truncationThreshold,
    dualEndBuffer: settings.dualEndBuffer,
    compressionMode: settings.compressionMode,
    compressionAutoThreshold: settings.compressionAutoThreshold,
    compressionChunkSize: settings.compressionChunkSize,
    compressionChunkOverlap: settings.compressionChunkOverlap,
    compressionEvidenceSegments: settings.compressionEvidenceSegments,
    autoResumeOnLength: settings.autoResumeOnLength,
    autoResumePhaseAnalysis: settings.autoResumePhaseAnalysis,
    autoResumePhaseOutline: settings.autoResumePhaseOutline,
    autoResumeMaxRounds: settings.autoResumeMaxRounds,
  }));

  const initialSignatureRef = useRef('');
  const didHydrateRef = useRef(false);

  const hydrateFromStore = () => {
    const nextProviders = clone(settings.providers);
    const nextPhase = clone(settings.phaseConfig);
    const nextDefaults = clone(settings.providerDefaults);
    const nextOverrides = clone(settings.modelOverrides);
    const nextPrompts = clone(settings.customPrompts);
    const nextSensoryTemplates = clone(settings.sensoryAnchorTemplates);
    const nextSensoryAutoByPhase = clone(settings.sensoryAutoTemplateByPhase);
    const nextContext = {
      truncationThreshold: settings.truncationThreshold,
      dualEndBuffer: settings.dualEndBuffer,
      compressionMode: settings.compressionMode,
      compressionAutoThreshold: settings.compressionAutoThreshold,
      compressionChunkSize: settings.compressionChunkSize,
      compressionChunkOverlap: settings.compressionChunkOverlap,
      compressionEvidenceSegments: settings.compressionEvidenceSegments,
      autoResumeOnLength: settings.autoResumeOnLength,
      autoResumePhaseAnalysis: settings.autoResumePhaseAnalysis,
      autoResumePhaseOutline: settings.autoResumePhaseOutline,
      autoResumeMaxRounds: settings.autoResumeMaxRounds,
    };

    setDraftProvider(settings.activeProvider);
    setDraftProviders(nextProviders);
    setDraftPhaseConfig(nextPhase);
    setDraftDefaults(nextDefaults);
    setDraftOverrides(nextOverrides);
    setDraftPrompts(nextPrompts);
    setDraftSensoryTemplates(nextSensoryTemplates);
    setDraftSensoryAutoTemplateByPhase(nextSensoryAutoByPhase);
    setDraftContext(nextContext);
    setOverrideProvider('nim');
    setOverrideModel(nextProviders.nim.selectedModel);

    initialSignatureRef.current = JSON.stringify({
      activeProvider: settings.activeProvider,
      providers: nextProviders,
      phaseConfig: nextPhase,
      providerDefaults: nextDefaults,
      modelOverrides: nextOverrides,
      prompts: nextPrompts,
      sensoryTemplates: nextSensoryTemplates,
      sensoryAutoByPhase: nextSensoryAutoByPhase,
      context: nextContext,
    });
    didHydrateRef.current = true;
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      // Use store getter here and run once to avoid re-initializing on every state update.
      // Re-initializing during save can overwrite fresh drafts with stale persisted data.
      await useSettingsStore.getState().initialize();
      if (active) {
        setIsInitialized(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isInitialized && !didHydrateRef.current) {
      hydrateFromStore();
    }
    // one-time hydration to avoid clobbering dirty draft
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, settings.activeProvider, settings.providers, settings.phaseConfig, settings.providerDefaults, settings.modelOverrides, settings.customPrompts, settings.sensoryAnchorTemplates, settings.sensoryAutoTemplateByPhase, settings.truncationThreshold, settings.dualEndBuffer, settings.compressionMode, settings.compressionAutoThreshold, settings.compressionChunkSize, settings.compressionChunkOverlap, settings.compressionEvidenceSegments, settings.autoResumeOnLength, settings.autoResumePhaseAnalysis, settings.autoResumePhaseOutline, settings.autoResumeMaxRounds]);

  const signature = useMemo(() => JSON.stringify({
    activeProvider: draftProvider,
    providers: draftProviders,
    phaseConfig: draftPhaseConfig,
    providerDefaults: draftDefaults,
    modelOverrides: draftOverrides,
    prompts: draftPrompts,
    sensoryTemplates: draftSensoryTemplates,
    sensoryAutoByPhase: draftSensoryAutoTemplateByPhase,
    context: draftContext,
  }), [draftProvider, draftProviders, draftPhaseConfig, draftDefaults, draftOverrides, draftPrompts, draftSensoryTemplates, draftSensoryAutoTemplateByPhase, draftContext]);

  const isDirty = didHydrateRef.current && signature !== initialSignatureRef.current;

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const availableModels = useMemo(() => ({
    nim: [...new Set(draftProviders.nim.recentModels)],
    openrouter: [...new Set(draftProviders.openrouter.recentModels)],
  }), [draftProviders]);

  const filteredPromptKeys = useMemo(() => {
    const q = promptSearch.trim().toLowerCase();
    if (!q) return PROMPT_KEYS;
    return PROMPT_KEYS.filter((key) => {
      const label = getPromptLabel(key).toLowerCase();
      const description = getPromptDescription(key).toLowerCase();
      return key.toLowerCase().includes(q) || label.includes(q) || description.includes(q);
    });
  }, [promptSearch]);

  const selectedPromptDraft = draftPrompts[selectedPrompt];
  const hasCustomPrompt =
    typeof selectedPromptDraft === 'string' && selectedPromptDraft.trim().length > 0;
  const currentPromptValue = hasCustomPrompt
    ? selectedPromptDraft
    : DEFAULT_PROMPTS[selectedPrompt];

  const validate = (): string[] => {
    const next: string[] = [];
    for (const phase of PHASES) {
      const selection = draftPhaseConfig[phase];
      const provider = selection?.provider ?? FALLBACK_PHASE_PROVIDER;
      const model = selection?.model?.trim() || draftProviders[provider]?.selectedModel?.trim();
      if (!provider) next.push(`${phase}: provider required`);
      if (!model) next.push(`${phase}: model required`);
      if (!allowCustomModelId && model && availableModels[provider].length > 0 && !availableModels[provider].includes(model)) {
        next.push(`${phase}: model not in fetched list`);
      }
    }
    return next;
  };

  const fetchModels = async (provider: LLMProvider) => {
    setLoadingModels((prev) => ({ ...prev, [provider]: true }));
    try {
      const models = await settings.fetchProviderModels(provider, draftProviders[provider].apiKey);
      setDraftProviders((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          recentModels: [...new Set([...models, ...prev[provider].recentModels])],
        },
      }));
    } finally {
      setLoadingModels((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const save = async () => {
    setSaveMessage('');
    const found = validate();
    setErrors(found);
    if (found.length > 0) return;

    setIsSaving(true);
    const startedAt =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    try {
      const normalizedPhaseConfig = PHASES.reduce((acc, phase) => {
        const selection = draftPhaseConfig[phase];
        const provider = selection?.provider ?? FALLBACK_PHASE_PROVIDER;
        const model = selection?.model?.trim() || draftProviders[provider].selectedModel;
        acc[phase] = { provider, model };
        return acc;
      }, {} as PhaseConfigMap);

      const normalizedOverrides = PROVIDERS.reduce((acc, provider) => {
        const source = draftOverrides[provider] || {};
        const cleaned: Record<string, Partial<GenerationParams>> = {};
        for (const [model, value] of Object.entries(source)) {
          const modelId = model.trim();
          if (!modelId || !value || Object.keys(value).length === 0) {
            continue;
          }
          cleaned[modelId] = value;
        }
        acc[provider] = cleaned;
        return acc;
      }, {} as Record<LLMProvider, Record<string, Partial<GenerationParams>>>);

      const normalizedPrompts = PROMPT_KEYS.reduce((acc, key) => {
        const nextValue = draftPrompts[key] ?? '';
        acc[key] = nextValue.trim() === DEFAULT_PROMPTS[key].trim() ? '' : nextValue;
        return acc;
      }, {} as Record<string, string>);

      await settings.applySettingsSnapshot({
        activeProvider: draftProvider,
        providers: draftProviders,
        phaseConfig: normalizedPhaseConfig,
        providerDefaults: {
          nim: normalizeParams(draftDefaults.nim),
          openrouter: normalizeParams(draftDefaults.openrouter),
        },
        modelOverrides: normalizedOverrides,
        customPrompts: normalizedPrompts,
        sensoryAnchorTemplates: draftSensoryTemplates,
        sensoryAutoTemplateByPhase: draftSensoryAutoTemplateByPhase,
        context: draftContext,
      });

      initialSignatureRef.current = signature;
      setSaveMessage('Saved.');
      const finishedAt =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
      setLastSaveDurationMs(finishedAt - startedAt);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedOverrideModel = (overrideModel || draftProviders[overrideProvider].selectedModel).trim();
  const hasSelectedOverrideModel = selectedOverrideModel.length > 0;
  const selectedOverrideValue = draftOverrides[overrideProvider]?.[selectedOverrideModel] || {};
  const sensoryTemplateOptions = useMemo(
    () => draftSensoryTemplates.map((entry) => ({ id: entry.id, name: entry.name })),
    [draftSensoryTemplates]
  );
  const canInteract = isInitialized && didHydrateRef.current;
  const handleBackToStudio = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
      return;
    }
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">Provider routing, model defaults/overrides, and prompts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBackToStudio}>
              Back to Studio
            </Button>
            <Button variant="outline" disabled={!canInteract || isSaving} onClick={hydrateFromStore}>Reload Saved</Button>
            <Button disabled={!canInteract || isSaving} onClick={save}>{isSaving ? 'Saving...' : 'Save Configuration'}</Button>
          </div>
        </div>

        <div className="rounded-lg border border-border p-3 text-xs font-mono" aria-live="polite">
          <p>Draft status: {isDirty ? 'Unsaved changes' : 'Up to date'}</p>
          {saveMessage && <p className="text-green-500">{saveMessage}</p>}
          {lastSaveDurationMs !== null && (
            <p className="text-muted-foreground">Last save: {Math.round(lastSaveDurationMs)} ms</p>
          )}
          {errors.length > 0 && (
            <ul className="list-disc list-inside text-destructive mt-2 space-y-1">
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          )}
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowDebug((v) => !v)}>
              {showDebug ? 'Hide Debug' : 'Show Debug'}
            </Button>
          </div>
          {showDebug && (
            <div className="mt-2 rounded border border-border/70 p-2 space-y-1 text-[11px]">
              <p>persistCount={settings.persistCount}</p>
              <p>lastPersistDurationMs={settings.lastPersistDurationMs ? Math.round(settings.lastPersistDurationMs) : 'n/a'}</p>
              <p>lastPersistAt={settings.lastPersistAt ? new Date(settings.lastPersistAt).toLocaleString() : 'n/a'}</p>
            </div>
          )}
        </div>

        <Tabs defaultValue="provider" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="provider">Provider</TabsTrigger>
            <TabsTrigger value="phases">Phase Routing</TabsTrigger>
            <TabsTrigger value="params">Model Params</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
          </TabsList>

          <TabsContent value="provider" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="active-provider">Active Provider</Label>
              <Select value={draftProvider} onValueChange={(v) => setDraftProvider(v as LLMProvider)}>
                <SelectTrigger id="active-provider" className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nim">NVIDIA NIM</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {PROVIDERS.map((provider) => (
              <div key={provider} className="rounded-lg border border-border p-4 space-y-2" aria-busy={loadingModels[provider]}>
                <h3 className="font-semibold uppercase text-sm">{provider}</h3>
                <Label htmlFor={`${provider}-api-key`}>{provider === 'nim' ? 'NIM API Key' : 'OpenRouter API Key'}</Label>
                <Input
                  id={`${provider}-api-key`}
                  name={`${provider}-api-key`}
                  type="password"
                  value={draftProviders[provider].apiKey}
                  onChange={(e) => setDraftProviders((prev) => ({ ...prev, [provider]: { ...prev[provider], apiKey: e.target.value } }))}
                  autoComplete="off"
                />
                <Label htmlFor={`${provider}-selected-model`}>Default Model</Label>
                <div className="flex gap-2">
                  <Input
                    id={`${provider}-selected-model`}
                    name={`${provider}-selected-model`}
                    value={draftProviders[provider].selectedModel}
                    onChange={(e) => setDraftProviders((prev) => ({ ...prev, [provider]: { ...prev[provider], selectedModel: e.target.value } }))}
                    list={`${provider}-models`}
                    autoComplete="off"
                  />
                  <datalist id={`${provider}-models`}>{availableModels[provider].map((model) => <option key={`${provider}-${model}`} value={model} />)}</datalist>
                  <Button variant="outline" disabled={loadingModels[provider]} onClick={() => void fetchModels(provider)}>{loadingModels[provider] ? 'Loading...' : 'Fetch Models'}</Button>
                </div>
                {loadingModels[provider] ? (
                  <div className="space-y-2 rounded-md border border-border/60 p-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted/60" />
                    <div className="h-4 w-full animate-pulse rounded bg-muted/50" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-muted/40" />
                  </div>
                ) : null}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="phases" className="space-y-3 pt-4">
            <label className="inline-flex items-center gap-2 text-xs">
              <input type="checkbox" checked={allowCustomModelId} onChange={(e) => setAllowCustomModelId(e.target.checked)} />
              Allow manual model IDs
            </label>
            {PHASES.map((phase) => {
              const selection = draftPhaseConfig[phase] ?? {
                provider: FALLBACK_PHASE_PROVIDER,
                model: draftProviders[FALLBACK_PHASE_PROVIDER].selectedModel,
              };
              return (
                <div key={phase} className="grid grid-cols-1 lg:grid-cols-4 gap-3 rounded-lg border border-border p-3">
                  <div>{PHASE_LABELS[phase]}</div>
                  <div className="space-y-1">
                    <Label htmlFor={`${phase}-provider`}>provider</Label>
                    <Select value={selection.provider} onValueChange={(value) => setDraftPhaseConfig((prev) => ({ ...prev, [phase]: { ...prev[phase], provider: value as LLMProvider } }))}>
                      <SelectTrigger id={`${phase}-provider`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nim">NVIDIA NIM</SelectItem>
                        <SelectItem value="openrouter">OpenRouter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="lg:col-span-2">
                    <Label htmlFor={`${phase}-model`}>model</Label>
                    <Input
                      id={`${phase}-model`}
                      name={`${phase}-model`}
                      value={selection.model || ''}
                      onChange={(e) => setDraftPhaseConfig((prev) => ({ ...prev, [phase]: { ...prev[phase], model: e.target.value } }))}
                      list={`phase-${phase}-${selection.provider}-models`}
                    />
                    <datalist id={`phase-${phase}-${selection.provider}-models`}>{availableModels[selection.provider].map((m) => <option key={`${phase}-${m}`} value={m} />)}</datalist>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="params" className="space-y-4 pt-4">
            {PROVIDERS.map((provider) => (
              <div key={provider} className="rounded-lg border border-border p-3 space-y-3">
                <h3 className="font-semibold uppercase text-sm">{provider} defaults</h3>
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`${provider}-default-maxTokens`}>max_tokens</Label>
                    <Input
                      id={`${provider}-default-maxTokens`}
                      name={`${provider}-default-maxTokens`}
                      type="number"
                      min={1}
                      step={1}
                      disabled={Boolean(draftDefaults[provider].autoMaxTokens)}
                      value={draftDefaults[provider].maxTokens}
                      onChange={(e) =>
                        setDraftDefaults((prev) => ({
                          ...prev,
                          [provider]: {
                            ...prev[provider],
                            maxTokens: parseRequiredIntInput(e.target.value, prev[provider].maxTokens),
                          },
                        }))
                      }
                    />
                    {getParamValidationMessage('maxTokens', draftDefaults[provider].maxTokens, {
                      autoMaxTokens: draftDefaults[provider].autoMaxTokens,
                    }) && (
                      <p className="text-[11px] text-destructive">{getParamValidationMessage('maxTokens', draftDefaults[provider].maxTokens, {
                        autoMaxTokens: draftDefaults[provider].autoMaxTokens,
                      })}</p>
                    )}
                    <div className="flex items-center justify-between rounded border border-border px-2 py-1">
                      <Label htmlFor={`${provider}-default-autoMaxTokens`} className="text-xs">auto_max_tokens</Label>
                      <Switch
                        id={`${provider}-default-autoMaxTokens`}
                        checked={Boolean(draftDefaults[provider].autoMaxTokens)}
                        onCheckedChange={(checked) =>
                          setDraftDefaults((prev) => ({
                            ...prev,
                            [provider]: {
                              ...prev[provider],
                              autoMaxTokens: checked,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${provider}-default-temperature`}>temperature</Label>
                    <Input
                      id={`${provider}-default-temperature`}
                      name={`${provider}-default-temperature`}
                      type="number"
                      min={0}
                      max={2}
                      step="0.1"
                      value={draftDefaults[provider].temperature}
                      onChange={(e) =>
                        setDraftDefaults((prev) => ({
                          ...prev,
                          [provider]: {
                            ...prev[provider],
                            temperature: parseRequiredFloatInput(e.target.value, prev[provider].temperature),
                          },
                        }))
                      }
                    />
                    {getParamValidationMessage('temperature', draftDefaults[provider].temperature) && (
                      <p className="text-[11px] text-destructive">{getParamValidationMessage('temperature', draftDefaults[provider].temperature)}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${provider}-default-topP`}>top_p</Label>
                    <Input
                      id={`${provider}-default-topP`}
                      name={`${provider}-default-topP`}
                      type="number"
                      min={0}
                      max={1}
                      step="0.05"
                      value={draftDefaults[provider].topP}
                      onChange={(e) =>
                        setDraftDefaults((prev) => ({
                          ...prev,
                          [provider]: {
                            ...prev[provider],
                            topP: parseRequiredFloatInput(e.target.value, prev[provider].topP),
                          },
                        }))
                      }
                    />
                    {getParamValidationMessage('topP', draftDefaults[provider].topP) && (
                      <p className="text-[11px] text-destructive">{getParamValidationMessage('topP', draftDefaults[provider].topP)}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${provider}-default-topK`}>top_k</Label>
                    <Input
                      id={`${provider}-default-topK`}
                      name={`${provider}-default-topK`}
                      type="number"
                      min={1}
                      step={1}
                      value={draftDefaults[provider].topK ?? ''}
                      onChange={(e) => setDraftDefaults((prev) => ({ ...prev, [provider]: { ...prev[provider], topK: e.target.value ? parseInt(e.target.value, 10) : undefined } }))}
                    />
                    {getParamValidationMessage('topK', draftDefaults[provider].topK) && (
                      <p className="text-[11px] text-destructive">{getParamValidationMessage('topK', draftDefaults[provider].topK)}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${provider}-default-frequencyPenalty`}>frequency_penalty</Label>
                    <Input
                      id={`${provider}-default-frequencyPenalty`}
                      name={`${provider}-default-frequencyPenalty`}
                      type="number"
                      step="0.1"
                      value={draftDefaults[provider].frequencyPenalty ?? ''}
                      onChange={(e) => setDraftDefaults((prev) => ({
                        ...prev,
                        [provider]: {
                          ...prev[provider],
                          frequencyPenalty: e.target.value ? parseFloat(e.target.value) : undefined,
                        },
                      }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${provider}-default-presencePenalty`}>presence_penalty</Label>
                    <Input
                      id={`${provider}-default-presencePenalty`}
                      name={`${provider}-default-presencePenalty`}
                      type="number"
                      step="0.1"
                      value={draftDefaults[provider].presencePenalty ?? ''}
                      onChange={(e) => setDraftDefaults((prev) => ({
                        ...prev,
                        [provider]: {
                          ...prev[provider],
                          presencePenalty: e.target.value ? parseFloat(e.target.value) : undefined,
                        },
                      }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`${provider}-default-thinking`}>thinking_enabled</Label>
                      <Switch
                        id={`${provider}-default-thinking`}
                        checked={Boolean(draftDefaults[provider].thinkingEnabled)}
                        onCheckedChange={(checked) =>
                          setDraftDefaults((prev) => ({
                            ...prev,
                            [provider]: {
                              ...prev[provider],
                              thinkingEnabled: checked,
                            },
                          }))
                        }
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Enable model reasoning mode by default for this provider.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${provider}-default-thinkingBudget`}>thinking_budget (optional)</Label>
                    <Input
                      id={`${provider}-default-thinkingBudget`}
                      name={`${provider}-default-thinkingBudget`}
                      type="number"
                      min={0}
                      step={128}
                      value={draftDefaults[provider].thinkingBudget ?? ''}
                      onChange={(e) =>
                        setDraftDefaults((prev) => ({
                          ...prev,
                          [provider]: {
                            ...prev[provider],
                            thinkingBudget: e.target.value ? parseRequiredIntInput(e.target.value, prev[provider].thinkingBudget ?? 0) : undefined,
                          },
                        }))
                      }
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {draftDefaults[provider].autoMaxTokens
                        ? 'Leave empty to use effective max_tokens automatically (OpenRouter reasoning).'
                        : 'Leave empty to omit reasoning budget override.'}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-lg border border-border p-3 space-y-3">
              <h3 className="font-semibold uppercase text-sm">Model Override</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="override-provider">provider</Label>
                  <Select value={overrideProvider} onValueChange={(v) => setOverrideProvider(v as LLMProvider)}>
                    <SelectTrigger id="override-provider"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="nim">NIM</SelectItem><SelectItem value="openrouter">OpenRouter</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="override-model">model</Label>
                  <Input
                    id="override-model"
                    name="override-model"
                    value={overrideModel}
                    onChange={(e) => setOverrideModel(e.target.value)}
                    list={`override-${overrideProvider}-models`}
                    placeholder={`Default: ${draftProviders[overrideProvider].selectedModel}`}
                  />
                  <datalist id={`override-${overrideProvider}-models`}>{availableModels[overrideProvider].map((m) => <option key={`override-${m}`} value={m} />)}</datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="override-maxTokens">max_tokens</Label>
                    <Input
                      id="override-maxTokens"
                      name="override-maxTokens"
                      type="number"
                      min={1}
                      step={1}
                      disabled={!hasSelectedOverrideModel || Boolean(selectedOverrideValue.autoMaxTokens)}
                      value={selectedOverrideValue.maxTokens ?? ''}
                      onChange={(e) => setDraftOverrides((prev) => ({ ...prev, [overrideProvider]: { ...prev[overrideProvider], [selectedOverrideModel]: { ...(prev[overrideProvider]?.[selectedOverrideModel] || {}), maxTokens: e.target.value ? parseInt(e.target.value, 10) : undefined } } }))}
                    />
                    {getParamValidationMessage('maxTokens', selectedOverrideValue.maxTokens, {
                      autoMaxTokens: selectedOverrideValue.autoMaxTokens,
                    }) && (
                      <p className="text-[11px] text-destructive">{getParamValidationMessage('maxTokens', selectedOverrideValue.maxTokens, {
                        autoMaxTokens: selectedOverrideValue.autoMaxTokens,
                      })}</p>
                    )}
                    <div className="flex items-center justify-between rounded border border-border px-2 py-1">
                      <Label htmlFor="override-autoMaxTokens" className="text-xs">auto_max_tokens</Label>
                      <Switch
                        id="override-autoMaxTokens"
                        checked={Boolean(selectedOverrideValue.autoMaxTokens)}
                        disabled={!hasSelectedOverrideModel}
                        onCheckedChange={(checked) =>
                          setDraftOverrides((prev) => ({
                            ...prev,
                            [overrideProvider]: {
                              ...prev[overrideProvider],
                              [selectedOverrideModel]: {
                                ...(prev[overrideProvider]?.[selectedOverrideModel] || {}),
                                autoMaxTokens: checked,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="override-temperature">temperature</Label>
                    <Input
                      id="override-temperature"
                      name="override-temperature"
                      type="number"
                      min={0}
                      max={2}
                      step="0.1"
                      disabled={!hasSelectedOverrideModel}
                      value={selectedOverrideValue.temperature ?? ''}
                      onChange={(e) => setDraftOverrides((prev) => ({ ...prev, [overrideProvider]: { ...prev[overrideProvider], [selectedOverrideModel]: { ...(prev[overrideProvider]?.[selectedOverrideModel] || {}), temperature: e.target.value ? parseFloat(e.target.value) : undefined } } }))}
                    />
                    {getParamValidationMessage('temperature', selectedOverrideValue.temperature) && (
                      <p className="text-[11px] text-destructive">{getParamValidationMessage('temperature', selectedOverrideValue.temperature)}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="override-topP">top_p</Label>
                    <Input
                      id="override-topP"
                      name="override-topP"
                      type="number"
                      min={0}
                      max={1}
                      step="0.05"
                      disabled={!hasSelectedOverrideModel}
                      value={selectedOverrideValue.topP ?? ''}
                      onChange={(e) => setDraftOverrides((prev) => ({ ...prev, [overrideProvider]: { ...prev[overrideProvider], [selectedOverrideModel]: { ...(prev[overrideProvider]?.[selectedOverrideModel] || {}), topP: e.target.value ? parseFloat(e.target.value) : undefined } } }))}
                    />
                    {getParamValidationMessage('topP', selectedOverrideValue.topP) && (
                      <p className="text-[11px] text-destructive">{getParamValidationMessage('topP', selectedOverrideValue.topP)}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="override-topK">top_k</Label>
                    <Input
                      id="override-topK"
                      name="override-topK"
                      type="number"
                      min={1}
                      step={1}
                      disabled={!hasSelectedOverrideModel}
                      value={selectedOverrideValue.topK ?? ''}
                      onChange={(e) => setDraftOverrides((prev) => ({ ...prev, [overrideProvider]: { ...prev[overrideProvider], [selectedOverrideModel]: { ...(prev[overrideProvider]?.[selectedOverrideModel] || {}), topK: e.target.value ? parseInt(e.target.value, 10) : undefined } } }))}
                    />
                    {getParamValidationMessage('topK', selectedOverrideValue.topK) && (
                      <p className="text-[11px] text-destructive">{getParamValidationMessage('topK', selectedOverrideValue.topK)}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="override-frequencyPenalty">frequency_penalty</Label>
                    <Input
                      id="override-frequencyPenalty"
                      name="override-frequencyPenalty"
                      type="number"
                      step="0.1"
                      disabled={!hasSelectedOverrideModel}
                      value={selectedOverrideValue.frequencyPenalty ?? ''}
                      onChange={(e) => setDraftOverrides((prev) => ({
                        ...prev,
                        [overrideProvider]: {
                          ...prev[overrideProvider],
                          [selectedOverrideModel]: {
                            ...(prev[overrideProvider]?.[selectedOverrideModel] || {}),
                            frequencyPenalty: e.target.value ? parseFloat(e.target.value) : undefined,
                          },
                        },
                      }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="override-presencePenalty">presence_penalty</Label>
                    <Input
                      id="override-presencePenalty"
                      name="override-presencePenalty"
                      type="number"
                      step="0.1"
                      disabled={!hasSelectedOverrideModel}
                      value={selectedOverrideValue.presencePenalty ?? ''}
                      onChange={(e) => setDraftOverrides((prev) => ({
                        ...prev,
                        [overrideProvider]: {
                          ...prev[overrideProvider],
                          [selectedOverrideModel]: {
                            ...(prev[overrideProvider]?.[selectedOverrideModel] || {}),
                            presencePenalty: e.target.value ? parseFloat(e.target.value) : undefined,
                          },
                        },
                      }))}
                    />
                  </div>
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="override-thinkingEnabled">thinking_enabled</Label>
                    <Switch
                      id="override-thinkingEnabled"
                      checked={Boolean(selectedOverrideValue.thinkingEnabled)}
                      disabled={!hasSelectedOverrideModel}
                      onCheckedChange={(checked) =>
                        setDraftOverrides((prev) => ({
                          ...prev,
                          [overrideProvider]: {
                            ...prev[overrideProvider],
                            [selectedOverrideModel]: {
                              ...(prev[overrideProvider]?.[selectedOverrideModel] || {}),
                              thinkingEnabled: checked,
                            },
                          },
                        }))
                      }
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Override thinking mode for this exact model id.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="override-thinkingBudget">thinking_budget (optional)</Label>
                  <Input
                    id="override-thinkingBudget"
                    name="override-thinkingBudget"
                    type="number"
                    min={0}
                    step={128}
                    disabled={!hasSelectedOverrideModel}
                    value={selectedOverrideValue.thinkingBudget ?? ''}
                    onChange={(e) => setDraftOverrides((prev) => ({ ...prev, [overrideProvider]: { ...prev[overrideProvider], [selectedOverrideModel]: { ...(prev[overrideProvider]?.[selectedOverrideModel] || {}), thinkingBudget: e.target.value ? parseInt(e.target.value, 10) : undefined } } }))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {selectedOverrideValue.autoMaxTokens
                      ? 'Leave empty to use effective max_tokens automatically (OpenRouter reasoning).'
                      : 'Leave empty to omit reasoning budget override.'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {hasSelectedOverrideModel ? 'Override applies only to this model.' : 'Select a model before editing override parameters.'}
              </p>
              <Button
                variant="outline"
                disabled={!hasSelectedOverrideModel}
                onClick={() => setDraftOverrides((prev) => { const p = { ...(prev[overrideProvider] || {}) }; delete p[selectedOverrideModel]; return { ...prev, [overrideProvider]: p }; })}
              >
                Clear Override
              </Button>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-2">
              <h3 className="font-semibold uppercase text-sm">Effective Config by Phase</h3>
              {PHASES.map((phase) => {
                const resolved = settings.getResolvedGenerationConfig(phase);
                return (
                  <div key={phase} className="text-xs font-mono rounded border border-border/60 p-2 space-y-1">
                    <p className="font-semibold">{PHASE_LABELS[phase]}</p>
                    <p className="break-all">provider={resolved.provider} model={resolved.model}</p>
                    <p>
                      max_tokens={resolved.params.autoMaxTokens ? 'auto' : resolved.params.maxTokens} temperature={resolved.params.temperature} top_p={resolved.params.topP} top_k={resolved.params.topK ?? 'n/a'}
                    </p>
                    <p>frequency_penalty={resolved.params.frequencyPenalty ?? 'n/a'} presence_penalty={resolved.params.presencePenalty ?? 'n/a'}</p>
                    <p>thinking_enabled={resolved.params.thinkingEnabled ? 'true' : 'false'} thinking_budget={resolved.params.thinkingBudget ?? 'n/a'}</p>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="context" className="space-y-3 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="context-truncation-threshold">truncation_threshold</Label>
                <Input
                  id="context-truncation-threshold"
                  name="context-truncation-threshold"
                  type="number"
                  value={draftContext.truncationThreshold}
                  onChange={(e) => setDraftContext((prev) => ({ ...prev, truncationThreshold: parseInt(e.target.value, 10) || prev.truncationThreshold }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="context-dual-end-buffer">dual_end_buffer</Label>
                <Input
                  id="context-dual-end-buffer"
                  name="context-dual-end-buffer"
                  type="number"
                  value={draftContext.dualEndBuffer}
                  onChange={(e) => setDraftContext((prev) => ({ ...prev, dualEndBuffer: parseInt(e.target.value, 10) || prev.dualEndBuffer }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="context-compression-auto-threshold">compression_auto_threshold</Label>
                <Input
                  id="context-compression-auto-threshold"
                  name="context-compression-auto-threshold"
                  type="number"
                  value={draftContext.compressionAutoThreshold}
                  onChange={(e) => setDraftContext((prev) => ({ ...prev, compressionAutoThreshold: parseInt(e.target.value, 10) || prev.compressionAutoThreshold }))}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-3">
              <h3 className="font-semibold uppercase text-sm">Auto Resume On Length Truncation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded border border-border px-3 py-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="context-auto-resume-on-length">auto_resume_on_length</Label>
                    <Switch
                      id="context-auto-resume-on-length"
                      checked={draftContext.autoResumeOnLength}
                      onCheckedChange={(checked) => setDraftContext((prev) => ({ ...prev, autoResumeOnLength: checked }))}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Enable automatic continuation only when finish_reason is length.
                  </p>
                </div>

                <div className="rounded border border-border px-3 py-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="context-auto-resume-phase-analysis">auto_resume_phase_analysis</Label>
                    <Switch
                      id="context-auto-resume-phase-analysis"
                      checked={draftContext.autoResumePhaseAnalysis}
                      onCheckedChange={(checked) => setDraftContext((prev) => ({ ...prev, autoResumePhaseAnalysis: checked }))}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Override for Phase 1 analysis.
                  </p>
                </div>

                <div className="rounded border border-border px-3 py-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="context-auto-resume-phase-outline">auto_resume_phase_outline</Label>
                    <Switch
                      id="context-auto-resume-phase-outline"
                      checked={draftContext.autoResumePhaseOutline}
                      onCheckedChange={(checked) => setDraftContext((prev) => ({ ...prev, autoResumePhaseOutline: checked }))}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Override for Phase 2 outline subtasks.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="context-auto-resume-max-rounds">auto_resume_max_rounds</Label>
                  <Input
                    id="context-auto-resume-max-rounds"
                    name="context-auto-resume-max-rounds"
                    type="number"
                    min={1}
                    max={4}
                    value={draftContext.autoResumeMaxRounds}
                    onChange={(e) => setDraftContext((prev) => ({ ...prev, autoResumeMaxRounds: parseRequiredIntInput(e.target.value, prev.autoResumeMaxRounds) }))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Max automatic continuation rounds per step/task (1-4).
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold uppercase text-sm">Sensory Anchor Templates</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDraftSensoryTemplates((prev) => ([
                    ...prev,
                    {
                      id: createTemplateId(),
                      name: `Template ${prev.length + 1}`,
                      content: '',
                    },
                  ]))}
                >
                  Add Template
                </Button>
              </div>

              <div className="space-y-3">
                {draftSensoryTemplates.map((template) => (
                  <div key={template.id} className="rounded border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={template.name}
                        onChange={(e) => setDraftSensoryTemplates((prev) => prev.map((entry) => (
                          entry.id === template.id
                            ? { ...entry, name: e.target.value }
                            : entry
                        )))}
                        placeholder="Template name"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDraftSensoryTemplates((prev) => prev.filter((entry) => entry.id !== template.id));
                          setDraftSensoryAutoTemplateByPhase((prev) => ({
                            chapter1: prev.chapter1 === template.id ? undefined : prev.chapter1,
                            continuation: prev.continuation === template.id ? undefined : prev.continuation,
                          }));
                        }}
                        disabled={draftSensoryTemplates.length <= 1}
                      >
                        Delete
                      </Button>
                    </div>
                    <Textarea
                      value={template.content}
                      onChange={(e) => setDraftSensoryTemplates((prev) => prev.map((entry) => (
                        entry.id === template.id
                          ? { ...entry, content: e.target.value }
                          : entry
                      )))}
                      className="min-h-[96px] text-xs font-mono"
                      placeholder="Concrete sensory constraints for chapter generation..."
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="sensory-auto-chapter1">chapter1_auto_template</Label>
                  <Select
                    value={draftSensoryAutoTemplateByPhase.chapter1 ?? '__none__'}
                    onValueChange={(value) => setDraftSensoryAutoTemplateByPhase((prev) => ({
                      ...prev,
                      chapter1: value === '__none__' ? undefined : value,
                    }))}
                  >
                    <SelectTrigger id="sensory-auto-chapter1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {sensoryTemplateOptions.map((entry) => (
                        <SelectItem key={`chapter1-${entry.id}`} value={entry.id}>
                          {entry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sensory-auto-continuation">continuation_auto_template</Label>
                  <Select
                    value={draftSensoryAutoTemplateByPhase.continuation ?? '__none__'}
                    onValueChange={(value) => setDraftSensoryAutoTemplateByPhase((prev) => ({
                      ...prev,
                      continuation: value === '__none__' ? undefined : value,
                    }))}
                  >
                    <SelectTrigger id="sensory-auto-continuation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {sensoryTemplateOptions.map((entry) => (
                        <SelectItem key={`continuation-${entry.id}`} value={entry.id}>
                          {entry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="prompts" className="space-y-4 pt-4">
            <div className="rounded-lg border border-border p-3 sticky top-2 bg-card/80 backdrop-blur space-y-2">
              <Input
                id="prompt-search"
                name="prompt-search"
                value={promptSearch}
                onChange={(e) => setPromptSearch(e.target.value)}
                placeholder="Search prompts..."
                autoComplete="off"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setDraftPrompts((prev) => ({ ...prev, [selectedPrompt]: DEFAULT_PROMPTS[selectedPrompt] }))}>Reset Selected</Button>
                <Button size="sm" variant="outline" onClick={() => setDraftPrompts(clone(DEFAULT_PROMPTS))}>Reset All</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Prompt edits are draft-only until you click <span className="font-semibold">Save Configuration</span>.
              </p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
              <div className="rounded-lg border border-border p-3 max-h-[70vh] overflow-y-auto space-y-3">
                {PROMPT_GROUPS.map((group) => {
                  const keys = group.keys.filter((k) => filteredPromptKeys.includes(k));
                  if (keys.length === 0) return null;
                  return (
                    <div key={group.title} className="space-y-2">
                      <p className="text-xs font-bold uppercase text-muted-foreground">{group.title}</p>
                      {keys.map((key) => (
                        <button key={key} type="button" className={`min-h-11 w-full rounded border px-2 py-2 text-left text-xs ${selectedPrompt === key ? 'border-primary bg-primary/10' : 'border-border bg-card/20'}`} onClick={() => setSelectedPrompt(key)}>
                          <p className="font-semibold">{getPromptLabel(key)}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{getPromptDescription(key)}</p>
                        </button>
                      ))}
                      <Separator />
                    </div>
                  );
                })}
              </div>
              <div className="rounded-lg border border-border p-3 space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{getPromptLabel(selectedPrompt)}</p>
                  <p className="text-xs text-muted-foreground">{getPromptDescription(selectedPrompt)}</p>
                  <p className={`text-xs ${hasCustomPrompt ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    {hasCustomPrompt ? 'Modified from default' : 'Using default content'}
                  </p>
                </div>
                <Label htmlFor="prompt-editor">Prompt Template</Label>
                <Textarea
                  id="prompt-editor"
                  name="prompt-editor"
                  className="min-h-[280px] font-mono text-xs"
                  value={currentPromptValue}
                  onChange={(e) => setDraftPrompts((prev) => ({ ...prev, [selectedPrompt]: e.target.value }))}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded border border-border p-2"><p className="text-xs font-semibold mb-1">Current</p><pre className="text-[11px] whitespace-pre-wrap max-h-52 overflow-auto">{currentPromptValue}</pre></div>
                  <div className="rounded border border-border p-2"><p className="text-xs font-semibold mb-1">Default</p><pre className="text-[11px] whitespace-pre-wrap max-h-52 overflow-auto">{DEFAULT_PROMPTS[selectedPrompt]}</pre></div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave Without Saving?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. If you leave this page now, those edits will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveConfirm(false)}>
              Stay
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowLeaveConfirm(false);
                router.push('/');
              }}
            >
              Leave Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
