'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { DEFAULT_PROMPTS } from '@/lib/prompts';
import type { GenerationParams, LLMProvider, PhaseConfigMap, ProviderScopedSettings } from '@/lib/llm-types';
import type { WorkflowStepId } from '@/store/useWorkflowStore';
import type { CompressionMode } from '@/lib/compression';

type PromptKey = keyof typeof DEFAULT_PROMPTS;

const PROVIDERS: LLMProvider[] = ['nim', 'openrouter'];
const PHASES: WorkflowStepId[] = ['compression', 'analysis', 'outline', 'breakdown', 'chapter1', 'continuation'];
const PHASE_LABELS: Record<WorkflowStepId, string> = {
  compression: 'Phase 0 Compression',
  analysis: 'Phase 1 Analysis',
  outline: 'Phase 2 Outline',
  breakdown: 'Phase 3 Breakdown',
  chapter1: 'Phase 4 Chapter 1',
  continuation: 'Phase 5 Continuation',
};
const PROMPT_KEYS = Object.keys(DEFAULT_PROMPTS) as PromptKey[];
const PROMPT_GROUPS: Array<{ title: string; keys: PromptKey[] }> = [
  { title: 'Workflow Core', keys: ['analysisCompressed', 'analysisRaw', 'outlineCompressed', 'outlineRaw', 'breakdown', 'chapter1Compressed', 'chapter1Raw', 'continuationCompressed', 'continuationRaw'] },
  { title: 'Compression Pipeline', keys: ['compression', 'compressionRoleCards', 'compressionStyleGuide', 'compressionPlotLedger', 'compressionEvidencePack'] },
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
  outlineCompressed: 'Generate outline with compressed context.',
  outlineRaw: 'Generate outline with full raw context.',
  breakdown: 'Convert outline into chapter-level framework.',
  chapter1Compressed: 'Generate chapter 1 with compressed context.',
  chapter1Raw: 'Generate chapter 1 with raw context.',
  continuationCompressed: 'Generate continuation chapter using compressed context.',
  continuationRaw: 'Generate continuation chapter using raw context.',
  consistency: 'Run consistency checks for timeline and character logic.',
};

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
    temperature: Number.isFinite(params.temperature) ? params.temperature : 0.7,
    topP: Number.isFinite(params.topP) ? params.topP : 1,
    topK: params.topK,
    frequencyPenalty: params.frequencyPenalty,
    presencePenalty: params.presencePenalty,
    seed: params.seed,
    thinkingEnabled: Boolean(params.thinkingEnabled),
    thinkingBudget: params.thinkingBudget,
  };
}

function getParamValidationMessage(param: 'maxTokens' | 'temperature' | 'topP' | 'topK', value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return '';
  if (param === 'maxTokens') {
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

export default function SettingsPage() {
  const settings = useSettingsStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
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
  const [draftContext, setDraftContext] = useState<{
    truncationThreshold: number;
    dualEndBuffer: number;
    compressionMode: CompressionMode;
    compressionAutoThreshold: number;
    compressionChunkSize: number;
    compressionChunkOverlap: number;
    compressionEvidenceSegments: number;
  }>(() => ({
    truncationThreshold: settings.truncationThreshold,
    dualEndBuffer: settings.dualEndBuffer,
    compressionMode: settings.compressionMode,
    compressionAutoThreshold: settings.compressionAutoThreshold,
    compressionChunkSize: settings.compressionChunkSize,
    compressionChunkOverlap: settings.compressionChunkOverlap,
    compressionEvidenceSegments: settings.compressionEvidenceSegments,
  }));

  const initialSignatureRef = useRef('');
  const didHydrateRef = useRef(false);

  const hydrateFromStore = () => {
    const nextProviders = clone(settings.providers);
    const nextPhase = clone(settings.phaseConfig);
    const nextDefaults = clone(settings.providerDefaults);
    const nextOverrides = clone(settings.modelOverrides);
    const nextPrompts = clone(settings.customPrompts);
    const nextContext = {
      truncationThreshold: settings.truncationThreshold,
      dualEndBuffer: settings.dualEndBuffer,
      compressionMode: settings.compressionMode,
      compressionAutoThreshold: settings.compressionAutoThreshold,
      compressionChunkSize: settings.compressionChunkSize,
      compressionChunkOverlap: settings.compressionChunkOverlap,
      compressionEvidenceSegments: settings.compressionEvidenceSegments,
    };

    setDraftProvider(settings.activeProvider);
    setDraftProviders(nextProviders);
    setDraftPhaseConfig(nextPhase);
    setDraftDefaults(nextDefaults);
    setDraftOverrides(nextOverrides);
    setDraftPrompts(nextPrompts);
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
  }, [isInitialized, settings.activeProvider, settings.providers, settings.phaseConfig, settings.providerDefaults, settings.modelOverrides, settings.customPrompts, settings.truncationThreshold, settings.dualEndBuffer, settings.compressionMode, settings.compressionAutoThreshold, settings.compressionChunkSize, settings.compressionChunkOverlap, settings.compressionEvidenceSegments]);

  const signature = useMemo(() => JSON.stringify({
    activeProvider: draftProvider,
    providers: draftProviders,
    phaseConfig: draftPhaseConfig,
    providerDefaults: draftDefaults,
    modelOverrides: draftOverrides,
    prompts: draftPrompts,
    context: draftContext,
  }), [draftProvider, draftProviders, draftPhaseConfig, draftDefaults, draftOverrides, draftPrompts, draftContext]);

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
      const provider = selection.provider;
      const model = selection.model?.trim() || draftProviders[provider].selectedModel?.trim();
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
        const model = selection.model?.trim() || draftProviders[selection.provider].selectedModel;
        acc[phase] = { provider: selection.provider, model };
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
  const canInteract = isInitialized && didHydrateRef.current;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">Provider routing, model defaults/overrides, and prompts</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/" onClick={(e) => { if (isDirty && !window.confirm('You have unsaved changes. Leave page?')) e.preventDefault(); }}>
                Back to Studio
              </Link>
            </Button>
            <Button variant="outline" disabled={!canInteract || isSaving} onClick={hydrateFromStore}>Reload Saved</Button>
            <Button disabled={!canInteract || isSaving} onClick={save}>{isSaving ? 'Saving…' : 'Save Configuration'}</Button>
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
              <div key={provider} className="rounded-lg border border-border p-4 space-y-2">
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
                  <Button variant="outline" disabled={loadingModels[provider]} onClick={() => void fetchModels(provider)}>{loadingModels[provider] ? 'Loading…' : 'Fetch Models'}</Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="phases" className="space-y-3 pt-4">
            <label className="inline-flex items-center gap-2 text-xs">
              <input type="checkbox" checked={allowCustomModelId} onChange={(e) => setAllowCustomModelId(e.target.checked)} />
              Allow manual model IDs
            </label>
            {PHASES.map((phase) => {
              const selection = draftPhaseConfig[phase];
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
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`${provider}-default-maxTokens`}>max_tokens</Label>
                    <Input
                      id={`${provider}-default-maxTokens`}
                      name={`${provider}-default-maxTokens`}
                      type="number"
                      min={1}
                      step={1}
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
                    {getParamValidationMessage('maxTokens', draftDefaults[provider].maxTokens) && (
                      <p className="text-[11px] text-destructive">{getParamValidationMessage('maxTokens', draftDefaults[provider].maxTokens)}</p>
                    )}
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="override-maxTokens">max_tokens</Label>
                    <Input
                      id="override-maxTokens"
                      name="override-maxTokens"
                      type="number"
                      min={1}
                      step={1}
                      disabled={!hasSelectedOverrideModel}
                      value={selectedOverrideValue.maxTokens ?? ''}
                      onChange={(e) => setDraftOverrides((prev) => ({ ...prev, [overrideProvider]: { ...prev[overrideProvider], [selectedOverrideModel]: { ...(prev[overrideProvider]?.[selectedOverrideModel] || {}), maxTokens: e.target.value ? parseInt(e.target.value, 10) : undefined } } }))}
                    />
                    {getParamValidationMessage('maxTokens', selectedOverrideValue.maxTokens) && (
                      <p className="text-[11px] text-destructive">{getParamValidationMessage('maxTokens', selectedOverrideValue.maxTokens)}</p>
                    )}
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
                      max_tokens={resolved.params.maxTokens} temperature={resolved.params.temperature} top_p={resolved.params.topP} top_k={resolved.params.topK ?? 'n/a'}
                    </p>
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
          </TabsContent>

          <TabsContent value="prompts" className="space-y-4 pt-4">
            <div className="rounded-lg border border-border p-3 sticky top-2 bg-card/80 backdrop-blur space-y-2">
              <Input
                id="prompt-search"
                name="prompt-search"
                value={promptSearch}
                onChange={(e) => setPromptSearch(e.target.value)}
                placeholder="Search prompts…"
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
                        <button key={key} type="button" className={`w-full rounded border px-2 py-2 text-left text-xs ${selectedPrompt === key ? 'border-primary bg-primary/10' : 'border-border bg-card/20'}`} onClick={() => setSelectedPrompt(key)}>
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
    </main>
  );
}
