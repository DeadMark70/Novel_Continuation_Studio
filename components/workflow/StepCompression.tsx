'use client';

import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, StopCircle, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { shouldRunCompression } from '@/lib/compression';

export const StepCompression: React.FC = () => {
  const { steps } = useWorkflowStore();
  const { wordCount } = useNovelStore();
  const { compressionMode, compressionAutoThreshold } = useSettingsStore();
  const { generate, stop } = useStepGenerator();

  const step = steps.compression;
  const isStreaming = step.status === 'streaming';
  const isCompleted = step.status === 'completed';
  const willRun = shouldRunCompression(compressionMode, wordCount, compressionAutoThreshold);

  const modeSummary = compressionMode === 'auto'
    ? `AUTO: ${wordCount.toLocaleString()} chars ${wordCount > compressionAutoThreshold ? '>' : '<='} ${compressionAutoThreshold.toLocaleString()} threshold`
    : `MODE: ${compressionMode.toUpperCase()}`;

  return (
    <Card className="border-l-4 border-l-sky-500">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-bold uppercase tracking-wider">Step 0: Compression</CardTitle>
          <CardDescription className="mt-1">
            {modeSummary} · {willRun ? 'Phase 0 will run' : 'Phase 0 will be skipped'}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {isStreaming ? (
            <Button variant="destructive" size="sm" onClick={stop} disabled={step.status !== 'streaming'}>
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
        <Textarea
          readOnly
          value={step.content}
          placeholder="Compression output will appear here..."
          className="min-h-[220px] font-mono text-sm bg-card/50 resize-y focus-visible:ring-0"
        />
        {step.error && (
          <p className="text-destructive text-xs mt-2 font-mono">ERROR: {step.error}</p>
        )}
      </CardContent>
    </Card>
  );
};
