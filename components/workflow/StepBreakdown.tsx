'use client';

import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, StopCircle, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const MIN_TARGET_CHAPTER_COUNT = 3;
const MAX_TARGET_CHAPTER_COUNT = 20;

function clampChapterCount(value: number): number {
  return Math.max(MIN_TARGET_CHAPTER_COUNT, Math.min(MAX_TARGET_CHAPTER_COUNT, value));
}

export const StepBreakdown: React.FC = () => {
  const { steps } = useWorkflowStore();
  const { targetChapterCount, setTargetChapterCount } = useNovelStore();
  const { generate, stop } = useStepGenerator();
  const [chapterCountInput, setChapterCountInput] = React.useState(targetChapterCount.toString());
  
  const step = steps.breakdown;
  const isStreaming = step.status === 'streaming';
  const isCompleted = step.status === 'completed';

  React.useEffect(() => {
    setChapterCountInput(targetChapterCount.toString());
  }, [targetChapterCount]);

  const commitTargetChapterCount = async (rawValue: string) => {
    const parsed = parseInt(rawValue, 10);
    const safeValue = Number.isFinite(parsed) ? clampChapterCount(parsed) : targetChapterCount;
    setChapterCountInput(safeValue.toString());
    await setTargetChapterCount(safeValue);
  };

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold uppercase tracking-wider">Step 3: Chapter Breakdown</CardTitle>
        <div className="flex gap-2">
          {isStreaming ? (
            <Button variant="destructive" size="sm" onClick={stop} disabled={step.status !== 'streaming'}>
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
        <div className="space-y-2 rounded-lg border border-amber-500/20 bg-card/30 p-3">
          <Label htmlFor="target-chapter-count" className="text-xs font-mono text-amber-500 font-bold">
            TARGET CHAPTER COUNT
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="target-chapter-count"
              type="number"
              min={MIN_TARGET_CHAPTER_COUNT}
              max={MAX_TARGET_CHAPTER_COUNT}
              step={1}
              value={chapterCountInput}
              onChange={(event) => setChapterCountInput(event.target.value)}
              onBlur={() => void commitTargetChapterCount(chapterCountInput)}
              className="w-32"
            />
            <span className="text-xs text-muted-foreground">
              Range: {MIN_TARGET_CHAPTER_COUNT}-{MAX_TARGET_CHAPTER_COUNT}
            </span>
          </div>
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
