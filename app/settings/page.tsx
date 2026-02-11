'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEFAULT_PROMPTS } from '@/lib/prompts';
import type {
  GenerationParams,
  LLMProvider,
  PhaseConfigMap,
  ProviderScopedSettings,
} from '@/lib/llm-types';
import type { WorkflowStepId } from '@/store/useWorkflowStore';

const PROVIDERS: LLMProvider[] = ['nim', 'openrouter'];
const PHASE_LABELS: Record<WorkflowStepId, string> = {
  compression: 'Phase 0 Compression',
  analysis: 'Phase 1 Analysis',
  outline: 'Phase 2 Outline',
  breakdown: 'Phase 3 Breakdown',
  chapter1: 'Phase 4 Chapter 1',
  continuation: 'Phase 5 Continuation',
};
const DEFAULT_PHASES: WorkflowStepId[] = [
  'compression',
  'analysis',
  'outline',
  'breakdown',
  'chapter1',
  'continuation',
];

const PROMPT_KEYS = Object.keys(DEFAULT_PROMPTS) as Array<keyof typeof DEFAULT_PROMPTS>;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
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

export default function SettingsPage() {
  const settings = useSettingsStore();
  const {
    initialize,
    activeProvider,
    providers,
    phaseConfig,
    providerDefaults,
    customPrompts,
    truncationThreshold,
    dualEndBuffer,
    compressionMode,
    compressionAutoThreshold,
    compressionChunkSize,
    compressionChunkOverlap,
    compressionEvidenceSegments,
    setActiveProvider,
    setProviderApiKey,
    setProviderSelectedModel,
    setPhaseSelection,
    setProviderDefaultParams,
    fetchProviderModels,
    setCustomPrompt,
    updateContextSettings,
  } = settings;

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState<Record<LLMProvider, boolean>>({
    nim: false,
    openrouter: false,
  });

  const [localActiveProvider, setLocalActiveProvider] = useState<LLMProvider>(activeProvider);
  const [localProviders, setLocalProviders] = useState<Record<LLMProvider, ProviderScopedSettings>>(deepClone(providers));
  const [localPhaseConfig, setLocalPhaseConfig] = useState<PhaseConfigMap>(deepClone(phaseConfig));
  const [localProviderDefaults, setLocalProviderDefaults] = useState<Record<LLMProvider, GenerationParams>>(deepClone(providerDefaults));
  const [localContext, setLocalContext] = useState({
    truncationThreshold,
    dualEndBuffer,
    compressionMode,
    compressionAutoThreshold,
    compressionChunkSize,
    compressionChunkOverlap,
    compressionEvidenceSegments,
  });

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    setLocalActiveProvider(activeProvider);
    setLocalProviders(deepClone(providers));
    setLocalPhaseConfig(deepClone(phaseConfig));
    setLocalProviderDefaults(deepClone(providerDefaults));
    setLocalContext({
      truncationThreshold,
      dualEndBuffer,
      compressionMode,
      compressionAutoThreshold,
      compressionChunkSize,
      compressionChunkOverlap,
      compressionEvidenceSegments,
    });
  }, [
    activeProvider,
    providers,
    phaseConfig,
    providerDefaults,
    truncationThreshold,
    dualEndBuffer,
    compressionMode,
    compressionAutoThreshold,
    compressionChunkSize,
    compressionChunkOverlap,
    compressionEvidenceSegments,
  ]);

  const availableModels = useMemo(() => ({
    nim: [...new Set(localProviders.nim.recentModels)],
    openrouter: [...new Set(localProviders.openrouter.recentModels)],
  }), [localProviders]);

  const handleFetchModels = async (provider: LLMProvider) => {
    setIsLoadingModels((prev) => ({ ...prev, [provider]: true }));
    try {
      const ids = await fetchProviderModels(provider, localProviders[provider].apiKey);
      setLocalProviders((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          recentModels: [...new Set([...ids, ...prev[provider].recentModels])],
        },
      }));
    } catch (error) {
      console.error(error);
      alert(`Failed to fetch ${provider} models.`);
    } finally {
      setIsLoadingModels((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setActiveProvider(localActiveProvider);
      for (const provider of PROVIDERS) {
        await setProviderApiKey(provider, localProviders[provider].apiKey);
        await setProviderSelectedModel(provider, localProviders[provider].selectedModel);
        await setProviderDefaultParams(provider, normalizeParams(localProviderDefaults[provider]));
      }
      for (const phaseId of Object.keys(localPhaseConfig) as WorkflowStepId[]) {
        await setPhaseSelection(phaseId, localPhaseConfig[phaseId]);
      }
      await updateContextSettings(localContext);
    } finally {
      setIsSaving(false);
    }
  };

  const updateProviderDefaults = (provider: LLMProvider, patch: Partial<GenerationParams>) => {
    setLocalProviderDefaults((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        ...patch,
      },
    }));
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">Provider, phase routing, and generation controls</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/">Back to Studio</Link>
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="provider" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="provider">Provider</TabsTrigger>
            <TabsTrigger value="phases">Phase Routing</TabsTrigger>
            <TabsTrigger value="params">Model Params</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
          </TabsList>

          <TabsContent value="provider" className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label>Active Provider</Label>
              <Select value={localActiveProvider} onValueChange={(value) => setLocalActiveProvider(value as LLMProvider)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nim">NVIDIA NIM</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {PROVIDERS.map((provider) => (
              <div key={provider} className="rounded-lg border border-border p-4 space-y-3">
                <h2 className="font-semibold uppercase text-sm">{provider}</h2>
                <div className="space-y-2">
                  <Label>{provider === 'nim' ? 'NIM API Key' : 'OpenRouter API Key'}</Label>
                  <Input
                    type="password"
                    value={localProviders[provider].apiKey}
                    onChange={(event) => setLocalProviders((prev) => ({
                      ...prev,
                      [provider]: { ...prev[provider], apiKey: event.target.value },
                    }))}
                    placeholder={provider === 'nim' ? 'nvapi-...' : 'sk-or-...'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Model</Label>
                  <div className="flex gap-2">
                    <Input
                      value={localProviders[provider].selectedModel}
                      onChange={(event) => setLocalProviders((prev) => ({
                        ...prev,
                        [provider]: { ...prev[provider], selectedModel: event.target.value },
                      }))}
                      list={`${provider}-models`}
                    />
                    <datalist id={`${provider}-models`}>
                      {availableModels[provider].map((model) => (
                        <option key={`${provider}-${model}`} value={model} />
                      ))}
                    </datalist>
                    <Button
                      variant="outline"
                      onClick={() => void handleFetchModels(provider)}
                      disabled={isLoadingModels[provider]}
                    >
                      {isLoadingModels[provider] ? 'Loading...' : 'Fetch Models'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="phases" className="space-y-4 pt-4">
            {DEFAULT_PHASES.map((phaseId: WorkflowStepId) => {
              const phaseSelection = localPhaseConfig[phaseId];
              const provider = phaseSelection.provider;
              const modelOptions = availableModels[provider];
              return (
                <div key={phaseId} className="grid grid-cols-1 lg:grid-cols-3 gap-3 rounded-lg border border-border p-4">
                  <div className="font-medium">{PHASE_LABELS[phaseId]}</div>
                  <Select
                    value={provider}
                    onValueChange={(value) => {
                      const nextProvider = value as LLMProvider;
                      setLocalPhaseConfig((prev) => ({
                        ...prev,
                        [phaseId]: {
                          provider: nextProvider,
                          model: prev[phaseId].model || localProviders[nextProvider].selectedModel,
                        },
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nim">NVIDIA NIM</SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                    </SelectContent>
                  </Select>
                  <div>
                    <Input
                      value={phaseSelection.model || ''}
                      onChange={(event) => setLocalPhaseConfig((prev) => ({
                        ...prev,
                        [phaseId]: {
                          ...prev[phaseId],
                          model: event.target.value,
                        },
                      }))}
                      list={`phase-${phaseId}-${provider}-models`}
                      placeholder="Model for this phase"
                    />
                    <datalist id={`phase-${phaseId}-${provider}-models`}>
                      {modelOptions.map((model: string) => (
                        <option key={`${phaseId}-${provider}-${model}`} value={model} />
                      ))}
                    </datalist>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="params" className="space-y-6 pt-4">
            {PROVIDERS.map((provider) => {
              const params = localProviderDefaults[provider];
              return (
                <div key={provider} className="rounded-lg border border-border p-4 space-y-4">
                  <h2 className="font-semibold uppercase text-sm">{provider} defaults</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label>max_tokens</Label>
                      <Input type="number" value={params.maxTokens} onChange={(e) => updateProviderDefaults(provider, { maxTokens: parseInt(e.target.value, 10) || 4096 })} />
                    </div>
                    <div className="space-y-1">
                      <Label>temperature</Label>
                      <Input type="number" step="0.1" value={params.temperature} onChange={(e) => updateProviderDefaults(provider, { temperature: parseFloat(e.target.value) || 0.7 })} />
                    </div>
                    <div className="space-y-1">
                      <Label>top_p</Label>
                      <Input type="number" step="0.05" value={params.topP} onChange={(e) => updateProviderDefaults(provider, { topP: parseFloat(e.target.value) || 1 })} />
                    </div>
                    <div className="space-y-1">
                      <Label>top_k</Label>
                      <Input type="number" value={params.topK ?? ''} onChange={(e) => updateProviderDefaults(provider, { topK: e.target.value ? parseInt(e.target.value, 10) : undefined })} />
                    </div>
                    <div className="space-y-1">
                      <Label>frequency_penalty</Label>
                      <Input type="number" step="0.1" value={params.frequencyPenalty ?? ''} onChange={(e) => updateProviderDefaults(provider, { frequencyPenalty: e.target.value ? parseFloat(e.target.value) : undefined })} />
                    </div>
                    <div className="space-y-1">
                      <Label>presence_penalty</Label>
                      <Input type="number" step="0.1" value={params.presencePenalty ?? ''} onChange={(e) => updateProviderDefaults(provider, { presencePenalty: e.target.value ? parseFloat(e.target.value) : undefined })} />
                    </div>
                    <div className="space-y-1">
                      <Label>thinking_budget</Label>
                      <Input type="number" value={params.thinkingBudget ?? ''} onChange={(e) => updateProviderDefaults(provider, { thinkingBudget: e.target.value ? parseInt(e.target.value, 10) : undefined })} />
                    </div>
                    <div className="space-y-1">
                      <Label>thinking_enabled</Label>
                      <Select
                        value={params.thinkingEnabled ? 'on' : 'off'}
                        onValueChange={(value) => updateProviderDefaults(provider, { thinkingEnabled: value === 'on' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="off">off</SelectItem>
                          <SelectItem value="on">on</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="context" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>truncationThreshold</Label>
                <Input type="number" value={localContext.truncationThreshold} onChange={(e) => setLocalContext((prev) => ({ ...prev, truncationThreshold: parseInt(e.target.value, 10) || prev.truncationThreshold }))} />
              </div>
              <div className="space-y-1">
                <Label>dualEndBuffer</Label>
                <Input type="number" value={localContext.dualEndBuffer} onChange={(e) => setLocalContext((prev) => ({ ...prev, dualEndBuffer: parseInt(e.target.value, 10) || prev.dualEndBuffer }))} />
              </div>
              <div className="space-y-1">
                <Label>compressionMode</Label>
                <Select
                  value={localContext.compressionMode}
                  onValueChange={(value) => setLocalContext((prev) => ({ ...prev, compressionMode: value as typeof prev.compressionMode }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">auto</SelectItem>
                    <SelectItem value="on">on</SelectItem>
                    <SelectItem value="off">off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>compressionAutoThreshold</Label>
                <Input type="number" value={localContext.compressionAutoThreshold} onChange={(e) => setLocalContext((prev) => ({ ...prev, compressionAutoThreshold: parseInt(e.target.value, 10) || prev.compressionAutoThreshold }))} />
              </div>
              <div className="space-y-1">
                <Label>compressionChunkSize</Label>
                <Input type="number" value={localContext.compressionChunkSize} onChange={(e) => setLocalContext((prev) => ({ ...prev, compressionChunkSize: parseInt(e.target.value, 10) || prev.compressionChunkSize }))} />
              </div>
              <div className="space-y-1">
                <Label>compressionChunkOverlap</Label>
                <Input type="number" value={localContext.compressionChunkOverlap} onChange={(e) => setLocalContext((prev) => ({ ...prev, compressionChunkOverlap: parseInt(e.target.value, 10) || prev.compressionChunkOverlap }))} />
              </div>
              <div className="space-y-1">
                <Label>compressionEvidenceSegments</Label>
                <Input type="number" value={localContext.compressionEvidenceSegments} onChange={(e) => setLocalContext((prev) => ({ ...prev, compressionEvidenceSegments: parseInt(e.target.value, 10) || prev.compressionEvidenceSegments }))} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="prompts" className="space-y-4 pt-4">
            <Tabs defaultValue={PROMPT_KEYS[0]} className="w-full">
              <TabsList className="w-full overflow-x-auto justify-start">
                {PROMPT_KEYS.map((key) => (
                  <TabsTrigger key={key} value={key} className="text-xs">
                    {key}
                  </TabsTrigger>
                ))}
              </TabsList>
              {PROMPT_KEYS.map((key) => (
                <TabsContent key={key} value={key} className="space-y-2">
                  <Label>{key}</Label>
                  <Textarea
                    className="min-h-[320px] font-mono text-xs"
                    value={customPrompts[key] ?? DEFAULT_PROMPTS[key]}
                    onChange={(event) => void setCustomPrompt(key, event.target.value)}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
