'use client';

import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Play, StopCircle, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { resolveWorkflowMode } from '@/lib/workflow-mode';

export const StepBreakdown: React.FC = () => {
  const { steps } = useWorkflowStore();
  const { compressionMode, compressionAutoThreshold } = useSettingsStore(
    useShallow((state) => ({
      compressionMode: state.compressionMode,
      compressionAutoThreshold: state.compressionAutoThreshold,
    }))
  );
  const { targetChapterCount, wordCount, compressedContext } = useNovelStore(
    useShallow((state) => ({
      targetChapterCount: state.targetChapterCount,
      wordCount: state.wordCount,
      compressedContext: state.compressedContext,
    }))
  );
  const { generate, stop } = useStepGenerator();
  
  const step = steps.breakdown;
  const isStreaming = step.status === 'streaming';
  const isCompleted = step.status === 'completed';
  const hasContent = step.content.trim().length > 0;
  const isTruncated = step.truncation.isTruncated;
  const modeMeta = resolveWorkflowMode({
    stepId: 'breakdown',
    compressionMode,
    compressionAutoThreshold,
    sourceChars: wordCount,
    compressedContext,
  });
  const modeClass = modeMeta.isCompressed
    ? 'border-amber-400/40 bg-amber-600/20 text-amber-200'
    : 'border-zinc-500/30 bg-zinc-700/30 text-zinc-200';

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-bold uppercase tracking-wider flex items-center gap-2">
            Step 3: Chapter Breakdown
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${modeClass}`}>
              {modeMeta.badge}
            </span>
          </CardTitle>
          <CardDescription className="mt-1 text-xs">{modeMeta.detail}</CardDescription>
        </div>
        <div className="flex gap-2">
          {isStreaming ? (
            <Button variant="destructive" size="sm" onClick={stop}>
              <StopCircle className="size-4 mr-2" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={() => generate('breakdown')}>
              {isCompleted ? <RefreshCw className="size-4 mr-2" /> : <Play className="size-4 mr-2" />}
              {isCompleted ? 'Regenerate' : 'Generate Breakdown'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`rounded-md border px-3 py-2 text-xs ${isTruncated ? 'border-amber-400/40 bg-amber-500/10 text-amber-200' : 'border-border/60 bg-card/30 text-muted-foreground'}`}>
          {isTruncated
            ? 'Detected length truncation in Phase 3. Auto-resume is disabled; click Regenerate to retry this step manually.'
            : hasContent
              ? 'Auto-resume is disabled. If output looks incomplete, rerun this step manually.'
              : 'Breakdown output status will appear here after generation.'}
        </div>

        <div className="space-y-2 rounded-lg border border-amber-500/20 bg-card/30 p-3">
          <Label className="text-xs font-mono text-amber-500 font-bold">
            TARGET CHAPTER COUNT (FROM PHASE 2)
          </Label>
          <p className="text-sm font-mono text-amber-400">{targetChapterCount} chapters</p>
          <p className="text-xs text-muted-foreground">
            Step 3 now auto-splits long chapter plans into chunks of 5 chapters per generation pass, based on this target count.
          </p>
        </div>

        <Textarea 
          readOnly 
          value={step.content} 
          placeholder="Breakdown output will appear here..."
          className="min-h-[200px] font-mono text-sm bg-card/50 resize-y focus-visible:ring-0"
        />
        {step.error && (
          <p className="text-destructive text-xs mt-2 font-mono">ERROR: {step.error}</p>
        )}
      </CardContent>
    </Card>
  );
};
