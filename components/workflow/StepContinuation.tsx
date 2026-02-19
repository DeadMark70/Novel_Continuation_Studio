'use client';

import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AutoModeControl } from './AutoModeControl';
import { ProgressIndicator } from './ProgressIndicator';
import { ConsistencyPanel } from './ConsistencyPanel';
import { resolveWorkflowMode } from '@/lib/workflow-mode';
import { mergeSensoryAnchorBlocks } from '@/lib/sensory-anchors';

export const StepContinuation: React.FC = () => {
  const step = useWorkflowStore((state) => state.steps.continuation);
  const isGenerating = useWorkflowStore((state) => state.isGenerating);
  const {
    compressionMode,
    compressionAutoThreshold,
    sensoryAnchorTemplates,
    sensoryAutoTemplateByPhase,
  } = useSettingsStore(
    useShallow((state) => ({
      compressionMode: state.compressionMode,
      compressionAutoThreshold: state.compressionAutoThreshold,
      sensoryAnchorTemplates: state.sensoryAnchorTemplates,
      sensoryAutoTemplateByPhase: state.sensoryAutoTemplateByPhase,
    }))
  );
  const { chapters, targetChapterCount, wordCount, compressedContext } = useNovelStore(
    useShallow((state) => ({
      chapters: state.chapters,
      targetChapterCount: state.targetChapterCount,
      wordCount: state.wordCount,
      compressedContext: state.compressedContext,
    }))
  );
  const { generate, stop } = useStepGenerator();
  const [sensoryAnchors, setSensoryAnchors] = React.useState('');
  const [selectedTemplateIds, setSelectedTemplateIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const validTemplateIds = new Set(sensoryAnchorTemplates.map((entry) => entry.id));
    const autoTemplateId = sensoryAutoTemplateByPhase.continuation;
    setSelectedTemplateIds((current) => {
      const filtered = current.filter((id) => validTemplateIds.has(id));
      if (filtered.length > 0) {
        return filtered;
      }
      if (autoTemplateId && validTemplateIds.has(autoTemplateId)) {
        return [autoTemplateId];
      }
      return [];
    });
  }, [sensoryAutoTemplateByPhase.continuation, sensoryAnchorTemplates]);

  const toggleTemplate = React.useCallback((id: string) => {
    setSelectedTemplateIds((current) => (
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id]
    ));
  }, []);
  
  // Calculate next chapter number (chapters array + 1)
  const nextChapterNumber = chapters.length + 1;
  const totalChapterCount = Math.max(2, targetChapterCount ?? 5);
  const hasWrittenChapters = chapters.length > 0;
  const modeMeta = resolveWorkflowMode({
    stepId: 'continuation',
    compressionMode,
    compressionAutoThreshold,
    sourceChars: wordCount,
    compressedContext,
  });
  const modeClass = modeMeta.isCompressed
    ? 'border-green-400/40 bg-green-600/20 text-green-200'
    : 'border-zinc-500/30 bg-zinc-700/30 text-zinc-200';

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-bold uppercase tracking-wider flex items-center gap-2">
            Step 5: Continuation
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${modeClass}`}>
              {modeMeta.badge}
            </span>
          </CardTitle>
          <CardDescription className="mt-1 text-xs">{modeMeta.detail}</CardDescription>
          {hasWrittenChapters && (
            <CardDescription className="flex items-center gap-1 mt-1">
              <BookOpen className="size-3" />
              已生成 {chapters.length}/{totalChapterCount} 章
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4 min-w-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-mono">Sensory Anchors (Optional)</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const selectedBlocks = sensoryAnchorTemplates
                      .filter((entry) => selectedTemplateIds.includes(entry.id))
                      .map((entry) => entry.content);
                    setSensoryAnchors((current) => mergeSensoryAnchorBlocks(current, selectedBlocks));
                  }}
                  disabled={selectedTemplateIds.length === 0}
                >
                  Apply Selected Templates
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedTemplateIds([])}
                  disabled={selectedTemplateIds.length === 0}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 rounded border border-border/60 p-2">
                {sensoryAnchorTemplates.map((entry) => {
                  const selected = selectedTemplateIds.includes(entry.id);
                  return (
                    <Button
                      key={entry.id}
                      type="button"
                      size="sm"
                      variant={selected ? 'default' : 'outline'}
                      className="h-7 px-2 text-[11px]"
                      onClick={() => toggleTemplate(entry.id)}
                    >
                      {entry.name}
                    </Button>
                  );
                })}
              </div>
              <Textarea
                value={sensoryAnchors}
                onChange={(event) => setSensoryAnchors(event.target.value)}
                placeholder="Concrete sensations only: temperature, texture, breath, sound, involuntary reaction..."
                className="min-h-[110px] text-xs font-mono"
              />
            </div>

            {/* Automation Controls */}
            {isGenerating ? (
              <ProgressIndicator 
                current={nextChapterNumber} 
                total={totalChapterCount} 
                onStop={stop}
                stopDisabled={false}
              />
            ) : (
              <AutoModeControl 
                onStart={() => generate('continuation', {
                  sensoryAnchors: sensoryAnchors.trim() || undefined,
                })}
              />
            )}

            {/* Output Area */}
            <Textarea 
              readOnly 
              value={step.content} 
              placeholder={`第 ${nextChapterNumber} 章的內容將在這裡顯示...`}
              className="min-h-[400px] font-mono text-sm bg-card/50 resize-y focus-visible:ring-0"
            />
            {step.error && (
              <p className="text-destructive text-xs mt-2 font-mono">ERROR: {step.error}</p>
            )}
          </div>

          <ConsistencyPanel />
        </div>
      </CardContent>
    </Card>
  );
};
