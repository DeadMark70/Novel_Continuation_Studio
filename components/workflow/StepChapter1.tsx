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
import { resolveWorkflowMode } from '@/lib/workflow-mode';

export const StepChapter1: React.FC = () => {
  const { steps, startStep } = useWorkflowStore();
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
  
  const step = steps.chapter1;
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
            <Button size="sm" onClick={() => generate('chapter1')}>
              {isCompleted ? <RefreshCw className="size-4 mr-2" /> : <Play className="size-4 mr-2" />}
              {isCompleted ? 'Regenerate' : 'Generate Chapter 1'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
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
