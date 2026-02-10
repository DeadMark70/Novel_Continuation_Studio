'use client';

import React, { useEffect, useRef } from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, StopCircle, RefreshCw, FastForward } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const MIN_TARGET_STORY_WORD_COUNT = 5000;
const MAX_TARGET_STORY_WORD_COUNT = 50000;
const MIN_TARGET_CHAPTER_COUNT = 3;
const MAX_TARGET_CHAPTER_COUNT = 20;

function clampStoryWordCount(value: number): number {
  return Math.max(MIN_TARGET_STORY_WORD_COUNT, Math.min(MAX_TARGET_STORY_WORD_COUNT, value));
}

function clampChapterCount(value: number): number {
  return Math.max(MIN_TARGET_CHAPTER_COUNT, Math.min(MAX_TARGET_CHAPTER_COUNT, value));
}

export const StepOutline: React.FC = () => {
  const { steps, currentStepId } = useWorkflowStore();
  const {
    outlineDirection,
    setOutlineDirection,
    targetStoryWordCount,
    setTargetStoryWordCount,
    targetChapterCount,
    setTargetChapterCount,
  } = useNovelStore();
  const { generate, stop } = useStepGenerator();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [storyWordCountInput, setStoryWordCountInput] = React.useState(targetStoryWordCount.toString());
  const [chapterCountInput, setChapterCountInput] = React.useState(targetChapterCount.toString());
  
  const step = steps.outline;
  const isStreaming = step.status === 'streaming';
  const isCompleted = step.status === 'completed';
  const isActive = currentStepId === 'outline';

  // Autofocus when this step becomes active and isn't completed yet
  useEffect(() => {
    if (isActive && !isCompleted && !isStreaming) {
      inputRef.current?.focus();
    }
  }, [isActive, isCompleted, isStreaming]);

  useEffect(() => {
    setStoryWordCountInput(targetStoryWordCount.toString());
  }, [targetStoryWordCount]);

  useEffect(() => {
    setChapterCountInput(targetChapterCount.toString());
  }, [targetChapterCount]);

  const commitStoryWordCount = async (rawValue: string) => {
    const parsed = parseInt(rawValue, 10);
    const safeValue = Number.isFinite(parsed) ? clampStoryWordCount(parsed) : targetStoryWordCount;
    setStoryWordCountInput(safeValue.toString());
    await setTargetStoryWordCount(safeValue);
  };

  const commitTargetChapterCount = async (rawValue: string) => {
    const parsed = parseInt(rawValue, 10);
    const safeValue = Number.isFinite(parsed) ? clampChapterCount(parsed) : targetChapterCount;
    setChapterCountInput(safeValue.toString());
    await setTargetChapterCount(safeValue);
  };

  return (
    <Card className="border-l-4 border-l-cyan-500 bg-cyan-500/5">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold uppercase tracking-wider flex items-center gap-2">
          Step 2: Outline Generation
          {isActive && !isCompleted && !isStreaming && (
            <span className="text-[10px] bg-cyan-500 text-white px-2 py-0.5 rounded-full animate-pulse">Waiting for Input</span>
          )}
        </CardTitle>
        <div className="flex gap-2">
          {isStreaming ? (
            <Button variant="destructive" size="sm" onClick={stop} disabled={step.status !== 'streaming'}>
              <StopCircle className="size-4 mr-2" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={() => {
              console.log('[StepOutline] Generate button clicked. plotDirection:', outlineDirection);
              generate('outline', outlineDirection);
            }} className={isActive && !isCompleted ? "bg-cyan-600 hover:bg-cyan-700 text-white" : ""}>
              {isCompleted ? <RefreshCw className="size-4 mr-2" /> : (isActive ? <FastForward className="size-4 mr-2" /> : <Play className="size-4 mr-2" />)}
              {isCompleted ? 'Regenerate' : (isActive ? 'Generate & Continue' : 'Generate Outline')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg border border-cyan-500/20 bg-card/30 p-3">
          <Label htmlFor="target-story-word-count" className="text-xs font-mono text-cyan-500 font-bold">
            TARGET STORY WORD COUNT
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="target-story-word-count"
              type="number"
              min={MIN_TARGET_STORY_WORD_COUNT}
              max={MAX_TARGET_STORY_WORD_COUNT}
              step={500}
              value={storyWordCountInput}
              onChange={(event) => setStoryWordCountInput(event.target.value)}
              onBlur={() => void commitStoryWordCount(storyWordCountInput)}
              className="w-40"
            />
            <span className="text-xs text-muted-foreground">
              Range: {MIN_TARGET_STORY_WORD_COUNT}-{MAX_TARGET_STORY_WORD_COUNT}
            </span>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-cyan-500/20 bg-card/30 p-3">
          <Label htmlFor="target-chapter-count" className="text-xs font-mono text-cyan-500 font-bold">
            TARGET CHAPTER COUNT (FOR PHASE 3 AUTO-RUN)
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

        <div className="space-y-2">
          <Label className="text-xs font-mono text-cyan-500 font-bold">
            {isActive && !isCompleted ? 'ACTION REQUIRED: Plot Direction / Notes' : 'OPTIONAL: Plot Direction / Notes'}
          </Label>
          <Textarea
            ref={inputRef}
            placeholder="e.g., Make the protagonist more aggressive, introduce a plot twist..." 
            value={outlineDirection}
            onChange={(e) => void setOutlineDirection(e.target.value)}
            className="min-h-[90px] bg-card/50 border-cyan-500/30 focus-visible:border-cyan-500 transition-colors resize-y"
          />
          {isActive && !isCompleted && (
            <p className="text-[10px] text-muted-foreground italic">Provide direction and click &quot;Generate & Continue&quot; to resume automation.</p>
          )}
        </div>

        <Textarea 
          readOnly 
          value={step.content} 
          placeholder="Outline output will appear here..."
          className="min-h-[300px] font-mono text-sm bg-card/50 resize-y focus-visible:ring-0"
        />
        {step.error && (
          <p className="text-destructive text-xs mt-2 font-mono">ERROR: {step.error}</p>
        )}
      </CardContent>
    </Card>
  );
};
