'use client';

import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, StopCircle, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { resolveWorkflowMode } from '@/lib/workflow-mode';

export const StepAnalysis: React.FC = () => {
  const { steps } = useWorkflowStore();
  const { compressionMode, compressionAutoThreshold } = useSettingsStore();
  const { wordCount, compressedContext } = useNovelStore();
  const { generate, stop } = useStepGenerator();
  
  const step = steps.analysis;
  const isStreaming = step.status === 'streaming';
  const isCompleted = step.status === 'completed';
  const modeMeta = resolveWorkflowMode({
    stepId: 'analysis',
    compressionMode,
    compressionAutoThreshold,
    sourceChars: wordCount,
    compressedContext,
  });
  const modeClass = modeMeta.isCompressed
    ? 'border-primary/40 bg-primary/20 text-primary-foreground'
    : 'border-zinc-500/30 bg-zinc-700/30 text-zinc-200';

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-bold uppercase tracking-wider flex items-center gap-2">
            Step 1: Novel Analysis
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
            <Button size="sm" onClick={() => generate('analysis')}>
              {isCompleted ? <RefreshCw className="size-4 mr-2" /> : <Play className="size-4 mr-2" />}
              {isCompleted ? 'Regenerate' : 'Start Analysis'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Textarea 
          readOnly 
          value={step.content} 
          placeholder="Analysis output will appear here..."
          className="min-h-[200px] font-mono text-sm bg-card/50 resize-y focus-visible:ring-0"
        />
        {step.error && (
          <p className="text-destructive text-xs mt-2 font-mono">ERROR: {step.error}</p>
        )}
      </CardContent>
    </Card>
  );
};
