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
import { AutoModeControl } from './AutoModeControl';
import { ProgressIndicator } from './ProgressIndicator';
import { ConsistencyPanel } from './ConsistencyPanel';
import { resolveWorkflowMode } from '@/lib/workflow-mode';

export const StepContinuation: React.FC = () => {
  const { steps, isGenerating } = useWorkflowStore();
  const { compressionMode, compressionAutoThreshold } = useSettingsStore(
    useShallow((state) => ({
      compressionMode: state.compressionMode,
      compressionAutoThreshold: state.compressionAutoThreshold,
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
  
  const step = steps.continuation;
  
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
                onStart={() => generate('continuation')} 
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
