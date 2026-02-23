'use client';

import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, StopCircle, RefreshCw, ArrowDownRight } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { resolveWorkflowMode } from '@/lib/workflow-mode';
import { mergeSensoryAnchorBlocks } from '@/lib/sensory-anchors';
import { Switch } from '@/components/ui/switch';

export const StepChapter1: React.FC = () => {
  const { step, startStep } = useWorkflowStore(
    useShallow((state) => ({
      step: state.steps.chapter1,
      startStep: state.startStep,
    }))
  );
  const {
    compressionMode,
    compressionAutoThreshold,
    sensoryAnchorTemplates,
    sensoryAutoTemplateByPhase,
    autoSensoryMapping,
    setAutoSensoryMapping,
  } = useSettingsStore(
    useShallow((state) => ({
      compressionMode: state.compressionMode,
      compressionAutoThreshold: state.compressionAutoThreshold,
      sensoryAnchorTemplates: state.sensoryAnchorTemplates,
      sensoryAutoTemplateByPhase: state.sensoryAutoTemplateByPhase,
      autoSensoryMapping: state.autoSensoryMapping,
      setAutoSensoryMapping: state.setAutoSensoryMapping,
    }))
  );
  const { wordCount, compressedContext } = useNovelStore(
    useShallow((state) => ({
      wordCount: state.wordCount,
      compressedContext: state.compressedContext,
    }))
  );
  const { generate, stop } = useStepGenerator();
  const [sensoryAnchors, setSensoryAnchors] = React.useState('');
  const [selectedTemplateIds, setSelectedTemplateIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const validTemplateIds = new Set(sensoryAnchorTemplates.map((entry) => entry.id));
    const autoTemplateId = sensoryAutoTemplateByPhase.chapter1;
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
  }, [sensoryAutoTemplateByPhase.chapter1, sensoryAnchorTemplates]);

  const ensureManualOverride = React.useCallback(() => {
    if (autoSensoryMapping) {
      void setAutoSensoryMapping(false);
    }
  }, [autoSensoryMapping, setAutoSensoryMapping]);

  const toggleTemplate = React.useCallback((id: string) => {
    ensureManualOverride();
    setSelectedTemplateIds((current) => (
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id]
    ));
  }, [ensureManualOverride]);
  
  const isStreaming = step.status === 'streaming';
  const isCompleted = step.status === 'completed';
  const modeMeta = resolveWorkflowMode({
    stepId: 'chapter1',
    compressionMode,
    compressionAutoThreshold,
    sourceChars: wordCount,
    compressedContext,
  });
  const modeClass = modeMeta.isCompressed
    ? 'border-purple-400/40 bg-purple-600/20 text-purple-200'
    : 'border-zinc-500/30 bg-zinc-700/30 text-zinc-200';

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-bold uppercase tracking-wider flex items-center gap-2">
            Step 4: Chapter 1
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${modeClass}`}>
              {modeMeta.badge}
            </span>
          </CardTitle>
          <CardDescription className="mt-1 text-xs">{modeMeta.detail}</CardDescription>
        </div>
        <div className="flex gap-2">
          {isCompleted && (
             <Button size="sm" variant="outline" onClick={() => startStep('continuation')}>
               Proceed to Phase V <ArrowDownRight className="size-4 ml-2" />
             </Button>
          )}
          {isStreaming ? (
            <Button variant="destructive" size="sm" onClick={stop}>
              <StopCircle className="size-4 mr-2" /> Stop
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => generate('chapter1', {
                sensoryAnchors: autoSensoryMapping
                  ? undefined
                  : (sensoryAnchors.trim() || undefined),
              })}
            >
              {isCompleted ? <RefreshCw className="size-4 mr-2" /> : <Play className="size-4 mr-2" />}
              {isCompleted ? 'Regenerate' : 'Generate Chapter 1'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between rounded border border-border/60 p-3">
            <div className="space-y-1">
              <Label className="text-xs font-mono">啟動自動感官巡航</Label>
              <p className="text-[11px] text-muted-foreground">
                生成時將依 Breakdown 章節與視角自動擷取感官片段。
              </p>
            </div>
            <Switch
              checked={autoSensoryMapping}
              onCheckedChange={(checked) => {
                void setAutoSensoryMapping(checked);
              }}
            />
          </div>
          {autoSensoryMapping && (
            <div className="rounded border border-dashed border-border/70 bg-muted/20 p-3 text-[11px] text-muted-foreground">
              Auto 模式為延遲綁定：具體注入內容會在生成時依當前章節框架動態決定。
            </div>
          )}
          <details className="rounded border border-border/60 p-2">
            <summary className="cursor-pointer text-xs font-mono">進階覆寫（手動）</summary>
            <div className="mt-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                編輯手動欄位會自動關閉自動巡航，改由你接管本章感官控制。
              </p>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-mono">Sensory Anchors (Optional)</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    ensureManualOverride();
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
                onChange={(event) => {
                  ensureManualOverride();
                  setSensoryAnchors(event.target.value);
                }}
                placeholder="Concrete sensations only: temperature, texture, breath, sound, involuntary reaction..."
                className="min-h-[110px] text-xs font-mono"
              />
            </div>
          </details>
        </div>
        <Textarea 
          readOnly 
          value={step.content} 
          placeholder="Chapter 1 content will appear here..."
          className="min-h-[400px] font-mono text-sm bg-card/50 resize-y focus-visible:ring-0"
        />
        {step.error && (
          <p className="text-destructive text-xs mt-2 font-mono">ERROR: {step.error}</p>
        )}
      </CardContent>
    </Card>
  );
};
