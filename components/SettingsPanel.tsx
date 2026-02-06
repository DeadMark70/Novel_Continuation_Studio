'use client';

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { fetchModels } from '@/lib/nim-client';
import { DEFAULT_PROMPTS } from '@/lib/prompts';

export const SettingsPanel: React.FC = () => {
  const { 
    apiKey, 
    selectedModel, 
    recentModels, 
    customPrompts, 
    truncationThreshold,
    dualEndBuffer,
    setApiKey, 
    setSelectedModel, 
    setCustomPrompt, 
    updateContextSettings,
    resetPrompt, 
    initialize 
  } = useSettingsStore();
  
  const [localKey, setLocalKey] = useState(apiKey);
  const [localModel, setLocalModel] = useState(selectedModel);
  const [localThreshold, setLocalThreshold] = useState(truncationThreshold);
  const [localBuffer, setLocalBuffer] = useState(dualEndBuffer);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      initialize();
      setLocalKey(apiKey);
      setLocalModel(selectedModel);
      setLocalThreshold(truncationThreshold);
      setLocalBuffer(dualEndBuffer);
    }
  }, [isOpen, apiKey, selectedModel, truncationThreshold, dualEndBuffer, initialize]);

  const handleSave = async () => {
    await setApiKey(localKey);
    await setSelectedModel(localModel);
    await updateContextSettings({
      truncationThreshold: localThreshold,
      dualEndBuffer: localBuffer,
    });
    setIsOpen(false);
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
              <p className="text-xs text-muted-foreground">Type to search or use fetched list.</p>
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
            </div>
          </TabsContent>
          
          <TabsContent value="prompts" className="space-y-4 py-4">
            <Tabs defaultValue="analysis" orientation="vertical" className="flex gap-4">
              <TabsList className="flex flex-col h-auto bg-transparent gap-2 w-32">
                <TabsTrigger value="analysis" className="w-full justify-start">Analysis</TabsTrigger>
                <TabsTrigger value="outline" className="w-full justify-start">Outline</TabsTrigger>
                <TabsTrigger value="breakdown" className="w-full justify-start">Breakdown</TabsTrigger>
                <TabsTrigger value="chapter1" className="w-full justify-start">Chapter 1</TabsTrigger>
                <TabsTrigger value="continuation" className="w-full justify-start">Continuation</TabsTrigger>
              </TabsList>
              
              <div className="flex-1 space-y-4">
                {Object.entries(DEFAULT_PROMPTS).map(([key, defaultValue]) => (
                  <TabsContent key={key} value={key} className="mt-0">
                    <div className="flex justify-between items-center mb-2">
                      <Label className="capitalize">{key} Prompt Template</Label>
                      <Button variant="ghost" size="sm" onClick={() => resetPrompt(key)}>
                        <RotateCcw className="size-3 mr-1" /> Reset
                      </Button>
                    </div>
                    <Textarea 
                      className="min-h-[300px] font-mono text-xs"
                      value={customPrompts[key] ?? defaultValue}
                      onChange={(e) => setCustomPrompt(key, e.target.value)}
                    />
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={handleSave}>
            <Save className="size-4 mr-2" />
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
