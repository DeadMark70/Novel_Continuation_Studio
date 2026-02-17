'use client';

import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, StopCircle, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { resolveWorkflowMode } from '@/lib/workflow-mode';
import { appendResumeLastOutputDirective } from '@/lib/resume-directive';

export const StepAnalysis: React.FC = () => {
  const { steps } = useWorkflowStore();
  const { compressionMode, compressionAutoThreshold } = useSettingsStore(
    useShallow((state) => ({
      compressionMode: state.compressionMode,
      compressionAutoThreshold: state.compressionAutoThreshold,
    }))
  );
  const { wordCount, compressedContext } = useNovelStore(
    useShallow((state) => ({
      wordCount: state.wordCount,
      compressedContext: state.compressedContext,
    }))
  );
  const { generate, stop } = useStepGenerator();
  
  const step = steps.analysis;
  const isStreaming = step.status === 'streaming';
  const isCompleted = step.status === 'completed';
  const hasContent = step.content.trim().length > 0;
  const isTruncated = step.truncation.isTruncated;
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

  const handleManualResume = () => {
    if (!hasContent) {
      return;
    }
    if (!isTruncated) {
      const confirmed = window.confirm(
        'No length truncation was detected in the last run. Continue anyway? This may duplicate content.'
      );
      if (!confirmed) {
        return;
      }
    }
    generate('analysis', appendResumeLastOutputDirective());
  };

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
            <>
              <Button size="sm" onClick={() => generate('analysis')}>
                {isCompleted ? <RefreshCw className="size-4 mr-2" /> : <Play className="size-4 mr-2" />}
                {isCompleted ? 'Regenerate' : 'Start Analysis'}
              </Button>
              <Button
                size="sm"
                variant={isTruncated ? 'secondary' : 'outline'}
                disabled={!hasContent}
                onClick={handleManualResume}
              >
                Resume Missing
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className={`mb-2 text-xs ${isTruncated ? 'text-amber-400' : 'text-muted-foreground'}`}>
          {isTruncated
            ? 'Detected length truncation. Resume Missing will continue from the previous output tail.'
            : hasContent
              ? 'Manual resume is available. If no truncation occurred, continuing may duplicate content.'
              : 'Manual resume button will be enabled after analysis has output content.'}
        </p>
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
