'use client';

import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, StopCircle, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { shouldRunCompression } from '@/lib/compression';
import { resolveWorkflowMode } from '@/lib/workflow-mode';

export const StepCompression: React.FC = () => {
  const { steps } = useWorkflowStore();
  const { wordCount, compressedContext } = useNovelStore(
    useShallow((state) => ({
      wordCount: state.wordCount,
      compressedContext: state.compressedContext,
    }))
  );
  const { compressionMode, compressionAutoThreshold } = useSettingsStore(
    useShallow((state) => ({
      compressionMode: state.compressionMode,
      compressionAutoThreshold: state.compressionAutoThreshold,
    }))
  );
  const { generate, stop } = useStepGenerator();

  const step = steps.compression;
  const isStreaming = step.status === 'streaming';
  const isCompleted = step.status === 'completed';
  const willRun = shouldRunCompression(compressionMode, wordCount, compressionAutoThreshold);

  const modeSummary = compressionMode === 'auto'
    ? `AUTO: ${wordCount.toLocaleString()} chars ${wordCount > compressionAutoThreshold ? '>' : '<='} ${compressionAutoThreshold.toLocaleString()} threshold`
    : `MODE: ${compressionMode.toUpperCase()}`;
  const modeMeta = resolveWorkflowMode({
    stepId: 'compression',
    compressionMode,
    compressionAutoThreshold,
    sourceChars: wordCount,
    compressedContext,
  });
  const modeClass = modeMeta.isCompressed
    ? 'border-sky-400/40 bg-sky-600/20 text-sky-300'
    : 'border-zinc-500/30 bg-zinc-700/30 text-zinc-200';

  return (
    <Card className="border-l-4 border-l-sky-500">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-bold uppercase tracking-wider flex items-center gap-2">
            Step 0: Compression
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${modeClass}`}>
              {modeMeta.badge}
            </span>
          </CardTitle>
          <CardDescription className="mt-1">
            {modeSummary} · {willRun ? 'Phase 0 will run' : 'Phase 0 will be skipped'} · {modeMeta.detail}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {isStreaming ? (
            <Button variant="destructive" size="sm" onClick={stop}>
              <StopCircle className="size-4 mr-2" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={() => generate('compression')} disabled={wordCount <= 0}>
              {isCompleted ? <RefreshCw className="size-4 mr-2" /> : <Play className="size-4 mr-2" />}
              {isCompleted ? 'Re-run Compression' : 'Start Compression'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-xs text-muted-foreground">
          Showing final combined output used by downstream phases (`compressedContext`).
        </p>
        <Textarea
          readOnly
          value={step.content}
          placeholder="Combined final compressed context will appear here..."
          className="min-h-[220px] font-mono text-sm bg-card/50 resize-y focus-visible:ring-0"
        />
        {step.error && (
          <p className="text-destructive text-xs mt-2 font-mono">ERROR: {step.error}</p>
        )}
      </CardContent>
    </Card>
  );
};
