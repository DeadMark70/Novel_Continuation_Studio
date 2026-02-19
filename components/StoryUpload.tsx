'use client';

import React, { useRef } from 'react';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Eraser } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { generateStreamByProvider } from '@/lib/nim-client';
import { buildSensoryTemplateHarvestPrompt, parseHarvestCandidates } from '@/lib/sensory-template-harvest';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HarvestTemplateDialog } from '@/components/workflow/HarvestTemplateDialog';

export const StoryUpload: React.FC = () => {
  const {
    originalNovel,
    setNovel,
    reset,
    harvestCandidates,
    setHarvestCandidates,
    clearHarvestCandidates,
  } = useNovelStore(
    useShallow((state) => ({
      originalNovel: state.originalNovel,
      setNovel: state.setNovel,
      reset: state.reset,
      harvestCandidates: state.harvestCandidates,
      setHarvestCandidates: state.setHarvestCandidates,
      clearHarvestCandidates: state.clearHarvestCandidates,
    }))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showInvalidFileDialog, setShowInvalidFileDialog] = React.useState(false);
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const [showHarvestDialog, setShowHarvestDialog] = React.useState(false);
  const [isHarvesting, setIsHarvesting] = React.useState(false);
  const [isSavingHarvest, setIsSavingHarvest] = React.useState(false);
  const [harvestError, setHarvestError] = React.useState<string | null>(null);
  const [harvestStatus, setHarvestStatus] = React.useState<string | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNovel(e.target.value);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      setShowInvalidFileDialog(true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setNovel(content);
    };
    reader.readAsText(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleHarvestTemplates = async () => {
    const sourceText = originalNovel.trim();
    if (!sourceText) {
      return;
    }

    setHarvestError(null);
    setHarvestStatus(null);
    setIsHarvesting(true);

    try {
      const settingsState = useSettingsStore.getState();
      const config = settingsState.getResolvedGenerationConfig('sensoryHarvest');

      const prompt = buildSensoryTemplateHarvestPrompt(sourceText);
      let rawOutput = '';

      const stream = generateStreamByProvider(
        config.provider,
        prompt,
        config.model,
        config.apiKey,
        undefined,
        {
          maxTokens: config.params.autoMaxTokens ? undefined : config.params.maxTokens,
          autoMaxTokens: config.params.autoMaxTokens,
          temperature: config.params.temperature,
          topP: config.params.topP,
          topK: config.params.topK,
          frequencyPenalty: config.params.frequencyPenalty,
          presencePenalty: config.params.presencePenalty,
          seed: config.params.seed,
          enableThinking: false,
          thinkingSupported: false,
          supportedParameters: config.supportedParameters,
          maxContextTokens: config.maxContextTokens,
          maxCompletionTokens: config.maxCompletionTokens,
        }
      );

      for await (const chunk of stream) {
        rawOutput += chunk;
      }

      const candidates = parseHarvestCandidates(rawOutput);
      setHarvestCandidates(candidates);
      setShowHarvestDialog(true);
      setHarvestStatus(`Extracted ${candidates.length} candidates.`);
    } catch (error) {
      setHarvestError(error instanceof Error ? error.message : 'Failed to harvest templates.');
    } finally {
      setIsHarvesting(false);
    }
  };

  const handleConfirmHarvest = async (selected: typeof harvestCandidates) => {
    if (selected.length === 0) {
      return;
    }
    setIsSavingHarvest(true);
    setHarvestError(null);
    try {
      await useSettingsStore.getState().addSensoryTemplatesFromHarvest(selected);
      setHarvestStatus(`Saved ${selected.length} templates to library.`);
      setShowHarvestDialog(false);
      clearHarvestCandidates();
    } catch (error) {
      setHarvestError(error instanceof Error ? error.message : 'Failed to save harvested templates.');
    } finally {
      setIsSavingHarvest(false);
    }
  };

  return (
    <Card className="w-full border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <FileText className="size-5" />
          Novel Input
        </CardTitle>
        <CardDescription>
          Paste your novel content or upload a .txt file to begin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full gap-1.5">
          <Label htmlFor="novel-content" className="text-muted-foreground">Original Text</Label>
          <Textarea
            id="novel-content"
            placeholder="Paste your story here..."
            className="min-h-[300px] resize-y font-sans leading-relaxed transition-all focus:border-primary/50"
            value={originalNovel}
            onChange={handleTextChange}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={triggerFileUpload}
            className="flex items-center gap-2 hover:border-primary/50"
          >
            <Upload className="size-4" />
            Upload TXT
          </Button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".txt" 
            className="hidden" 
          />

          <Button 
            variant="destructive" 
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2"
          >
            <Eraser className="size-4" />
            Clear
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              void handleHarvestTemplates();
            }}
            disabled={isHarvesting || !originalNovel.trim()}
            className="flex items-center gap-2"
          >
            {isHarvesting ? 'Harvesting...' : 'Harvest Sensory Templates'}
          </Button>
        </div>
        {harvestError && (
          <p className="text-xs font-mono text-destructive">{harvestError}</p>
        )}
        {harvestStatus && (
          <p className="text-xs font-mono text-emerald-500">{harvestStatus}</p>
        )}
      </CardContent>
      <Dialog open={showInvalidFileDialog} onOpenChange={setShowInvalidFileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invalid File Type</DialogTitle>
            <DialogDescription>
              Please upload a plain text file (`.txt`) to import novel content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowInvalidFileDialog(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear Current Content?</DialogTitle>
            <DialogDescription>
              This will clear the current novel text in the editor.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void reset();
                clearHarvestCandidates();
                setHarvestStatus(null);
                setHarvestError(null);
                setShowClearConfirm(false);
              }}
            >
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <HarvestTemplateDialog
        open={showHarvestDialog}
        candidates={harvestCandidates}
        isSaving={isSavingHarvest}
        onOpenChange={(open) => {
          setShowHarvestDialog(open);
          if (!open) {
            clearHarvestCandidates();
          }
        }}
        onConfirm={handleConfirmHarvest}
      />
    </Card>
  );
};
