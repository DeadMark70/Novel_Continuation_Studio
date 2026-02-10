'use client';

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { fetchModels } from '@/lib/nim-client';
import { DEFAULT_PROMPTS } from '@/lib/prompts';
import {
  getEffectiveThinkingSupportState,
  isThinkingUnsupported as isThinkingCapabilityUnsupported
} from '@/lib/thinking-mode';
import { type CompressionMode } from '@/lib/compression';

type PromptKey = keyof typeof DEFAULT_PROMPTS;

const PROMPT_TAB_ITEMS: Array<{ key: PromptKey; label: string }> = [
  { key: 'analysis', label: 'Analysis' },
  { key: 'compression', label: 'Compression' },
  { key: 'compressionRoleCards', label: 'Compression Role Cards' },
  { key: 'compressionStyleGuide', label: 'Compression Style Guide' },
  { key: 'compressionPlotLedger', label: 'Compression Plot Ledger' },
  { key: 'compressionEvidencePack', label: 'Compression Evidence Pack' },
  { key: 'outlineCompressed', label: 'Outline (Compressed)' },
  { key: 'outlineRaw', label: 'Outline (Raw)' },
  { key: 'breakdown', label: 'Breakdown' },
  { key: 'chapter1Compressed', label: 'Chapter 1 (Compressed)' },
  { key: 'chapter1Raw', label: 'Chapter 1 (Raw)' },
  { key: 'continuationCompressed', label: 'Continuation (Compressed)' },
  { key: 'continuationRaw', label: 'Continuation (Raw)' },
  { key: 'consistency', label: 'Consistency' },
];

export const SettingsPanel: React.FC = () => {
  const { 
    apiKey, 
    selectedModel, 
    recentModels, 
    customPrompts, 
    truncationThreshold,
    dualEndBuffer,
    compressionMode,
    compressionAutoThreshold,
    compressionChunkSize,
    compressionChunkOverlap,
    compressionEvidenceSegments,
    thinkingEnabled,
    modelCapabilities,
    setApiKey, 
    setSelectedModel, 
    setCustomPrompt, 
    setThinkingEnabled,
    upsertModelCapability,
    probeModelCapability,
    updateContextSettings,
    resetPrompt, 
    initialize 
  } = useSettingsStore();
  
  const [localKey, setLocalKey] = useState(apiKey);
  const [localModel, setLocalModel] = useState(selectedModel);
  const [localThreshold, setLocalThreshold] = useState(truncationThreshold);
  const [localBuffer, setLocalBuffer] = useState(dualEndBuffer);
  const [localCompressionMode, setLocalCompressionMode] = useState<CompressionMode>(compressionMode);
  const [localCompressionThreshold, setLocalCompressionThreshold] = useState(compressionAutoThreshold);
  const [localCompressionChunkSize, setLocalCompressionChunkSize] = useState(compressionChunkSize);
  const [localCompressionChunkOverlap, setLocalCompressionChunkOverlap] = useState(compressionChunkOverlap);
  const [localCompressionEvidenceSegments, setLocalCompressionEvidenceSegments] = useState(compressionEvidenceSegments);
  const [localThinkingEnabled, setLocalThinkingEnabled] = useState(thinkingEnabled);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isProbingCapability, setIsProbingCapability] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const activeCapability = modelCapabilities[localModel] ?? modelCapabilities[selectedModel];
  const thinkingSupportState = getEffectiveThinkingSupportState(activeCapability);
  const isThinkingUnsupported = isThinkingCapabilityUnsupported(activeCapability);
  const thinkingBlockedReason = isThinkingUnsupported
    ? (activeCapability?.reason ?? 'Current model does not support thinking mode.')
    : '';
  const capabilitySummary = activeCapability
    ? `Chat: ${activeCapability.chatSupported ? 'supported' : 'unsupported'} | Thinking: ${thinkingSupportState}`
    : 'Capability unknown. Probe or save model selection to detect support.';

  useEffect(() => {
    if (isOpen) {
      initialize();
      setLocalKey(apiKey);
      setLocalModel(selectedModel);
      setLocalThreshold(truncationThreshold);
      setLocalBuffer(dualEndBuffer);
      setLocalCompressionMode(compressionMode);
      setLocalCompressionThreshold(compressionAutoThreshold);
      setLocalCompressionChunkSize(compressionChunkSize);
      setLocalCompressionChunkOverlap(compressionChunkOverlap);
      setLocalCompressionEvidenceSegments(compressionEvidenceSegments);
      setLocalThinkingEnabled(thinkingEnabled);
    }
  }, [
    isOpen,
    apiKey,
    selectedModel,
    truncationThreshold,
    dualEndBuffer,
    compressionMode,
    compressionAutoThreshold,
    compressionChunkSize,
    compressionChunkOverlap,
    compressionEvidenceSegments,
    thinkingEnabled,
    initialize,
  ]);

  const handleSave = async () => {
    const canEnableThinking = thinkingSupportState !== 'unsupported';
    setIsSaving(true);
    try {
      await setApiKey(localKey);
      await setSelectedModel(localModel);
      await setThinkingEnabled(canEnableThinking ? localThinkingEnabled : false);
      await updateContextSettings({
        truncationThreshold: localThreshold,
        dualEndBuffer: localBuffer,
        compressionMode: localCompressionMode,
        compressionAutoThreshold: localCompressionThreshold,
        compressionChunkSize: localCompressionChunkSize,
        compressionChunkOverlap: localCompressionChunkOverlap,
        compressionEvidenceSegments: localCompressionEvidenceSegments,
      });
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProbeCapability = async () => {
    if (!localModel.trim()) {
      return;
    }
    setIsProbingCapability(true);
    try {
      const capability = await probeModelCapability(localModel, localKey);
      await upsertModelCapability(localModel, capability);
      if (isThinkingCapabilityUnsupported(capability)) {
        setLocalThinkingEnabled(false);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to probe model capability.');
    } finally {
      setIsProbingCapability(false);
    }
  };

  const handleFetchModels = async () => {
    setIsLoadingModels(true);
    try {
      // Pass localKey if present, otherwise fetchModels will try to use backend env var
      const models = await fetchModels(localKey);
      setAvailableModels(models.map(m => m.id));
    } catch (error) {
      console.error(error);
      alert('Failed to fetch models. Check API Key or Network.');
    } finally {
      setIsLoadingModels(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>System Configuration</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
            <TabsTrigger value="prompts">Prompt Engineering</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>NVIDIA NIM API Key</Label>
              <div className="flex gap-2">
                <Input 
                  type="password" 
                  value={localKey} 
                  onChange={(e) => setLocalKey(e.target.value)} 
                  placeholder="nvapi-..."
                />
                <Button variant="outline" onClick={handleFetchModels} disabled={isLoadingModels}>
                  {isLoadingModels ? 'Loading...' : 'Fetch Models'}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Leave blank to use server environment variable (if configured).</p>
            </div>

            <div className="space-y-2">
              <Label>Model Selection</Label>
              <div className="relative">
                <Input 
                  value={localModel} 
                  onChange={(e) => setLocalModel(e.target.value)} 
                  placeholder="Select or type model name..."
                  list="model-history"
                />
                <datalist id="model-history">
                  {availableModels.length > 0 ? (
                    [...new Set(availableModels)].map((m, i) => <option key={`${m}-${i}`} value={m} />)
                  ) : (
                    [...new Set(recentModels)].map((m, i) => <option key={`${m}-${i}`} value={m} />)
                  )}
                </datalist>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleProbeCapability}
                  disabled={isProbingCapability || !localModel.trim()}
                >
                  {isProbingCapability ? 'Probing...' : 'Probe Capability'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{capabilitySummary}</p>
              {thinkingBlockedReason && (
                <p className="text-xs text-destructive">{thinkingBlockedReason}</p>
              )}
              <p className="text-xs text-muted-foreground">Type to search or use fetched list.</p>
            </div>

            <div className="space-y-2 rounded-lg border border-border/70 p-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="thinking-mode-toggle">Thinking Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable only when the selected model supports thinking parameters.
                  </p>
                </div>
                <Switch
                  id="thinking-mode-toggle"
                  checked={localThinkingEnabled}
                  onCheckedChange={setLocalThinkingEnabled}
                  disabled={isThinkingUnsupported}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="context" className="space-y-4 py-4" forceMount>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="truncationThreshold">Truncation Threshold (Characters)</Label>
                <Input 
                  id="truncationThreshold"
                  data-testid="threshold-input"
                  type="number" 
                  value={localThreshold} 
                  onChange={(e) => setLocalThreshold(parseInt(e.target.value) || 0)} 
                />
                <p className="text-xs text-muted-foreground">Chapters longer than this will be truncated in prompts.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dualEndBuffer">Dual-End Buffer (Characters)</Label>
                <Input 
                  id="dualEndBuffer"
                  data-testid="buffer-input"
                  type="number" 
                  value={localBuffer} 
                  onChange={(e) => setLocalBuffer(parseInt(e.target.value) || 0)} 
                />
                <p className="text-xs text-muted-foreground">Characters to keep at each end of a truncated chapter.</p>
              </div>

              <div className="space-y-2 border-t border-border/60 pt-4">
                <Label>Phase 0 Compression Mode</Label>
                <Select
                  value={localCompressionMode}
                  onValueChange={(value) => setLocalCompressionMode(value as CompressionMode)}
                >
                  <SelectTrigger
                    id="compression-mode"
                    data-testid="compression-mode-select"
                    className="w-full bg-card text-foreground"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="on">Always On</SelectItem>
                    <SelectItem value="off">Always Off</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Auto uses a user-defined character threshold to decide whether Phase 0 runs.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="compression-threshold">Compression Auto Threshold (Characters)</Label>
                <Input
                  id="compression-threshold"
                  data-testid="compression-threshold-input"
                  type="number"
                  min={5000}
                  step={1000}
                  value={localCompressionThreshold}
                  onChange={(e) => setLocalCompressionThreshold(parseInt(e.target.value, 10) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  In auto mode, novels longer than this threshold will run Phase 0 compression.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="compression-chunk-size">Compression Chunk Size (Characters)</Label>
                <Input
                  id="compression-chunk-size"
                  data-testid="compression-chunk-size-input"
                  type="number"
                  min={1000}
                  step={500}
                  value={localCompressionChunkSize}
                  onChange={(e) => setLocalCompressionChunkSize(parseInt(e.target.value, 10) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="compression-overlap">Compression Chunk Overlap (Characters)</Label>
                <Input
                  id="compression-overlap"
                  data-testid="compression-overlap-input"
                  type="number"
                  min={0}
                  step={100}
                  value={localCompressionChunkOverlap}
                  onChange={(e) => setLocalCompressionChunkOverlap(parseInt(e.target.value, 10) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="compression-evidence-count">Compression Evidence Segment Count</Label>
                <Input
                  id="compression-evidence-count"
                  data-testid="compression-evidence-count-input"
                  type="number"
                  min={4}
                  max={16}
                  step={1}
                  value={localCompressionEvidenceSegments}
                  onChange={(e) => setLocalCompressionEvidenceSegments(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="prompts" className="space-y-4 py-4">
            <Tabs defaultValue="analysis" orientation="vertical" className="flex gap-4">
              <TabsList className="flex flex-col h-auto bg-transparent gap-2 w-56">
                {PROMPT_TAB_ITEMS.map((item) => (
                  <TabsTrigger key={item.key} value={item.key} className="w-full justify-start text-xs">
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
               
              <div className="flex-1 space-y-4">
                {PROMPT_TAB_ITEMS.map((item) => (
                  <TabsContent key={item.key} value={item.key} className="mt-0">
                    <div className="flex justify-between items-center mb-2">
                      <Label>{item.label} Prompt Template</Label>
                      <Button variant="ghost" size="sm" onClick={() => resetPrompt(item.key)}>
                        <RotateCcw className="size-3 mr-1" /> Reset
                      </Button>
                    </div>
                    <Textarea 
                      className="min-h-[300px] font-mono text-xs"
                      value={customPrompts[item.key] ?? DEFAULT_PROMPTS[item.key]}
                      onChange={(e) => setCustomPrompt(item.key, e.target.value)}
                    />
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="size-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
