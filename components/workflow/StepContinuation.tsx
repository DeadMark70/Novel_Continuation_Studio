'use client';

import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { AutoModeControl } from './AutoModeControl';
import { ProgressIndicator } from './ProgressIndicator';
import { ConsistencyPanel } from './ConsistencyPanel';

export const StepContinuation: React.FC = () => {
  const { steps, isGenerating } = useWorkflowStore();
  const { chapters, targetChapterCount } = useNovelStore();
  const { generate, stop } = useStepGenerator();
  
  const step = steps.continuation;
  
  // Calculate next chapter number (chapters array + 1)
  const nextChapterNumber = chapters.length + 1;
  const totalChapterCount = Math.max(2, targetChapterCount ?? 5);
  const hasWrittenChapters = chapters.length > 0;

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-bold uppercase tracking-wider">Step 5: Continuation</CardTitle>
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
