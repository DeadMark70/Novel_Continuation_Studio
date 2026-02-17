'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { FastForward, Play, RefreshCw, StopCircle } from 'lucide-react';
import type { OutlineTask } from '@/hooks/useStepOutlineController';

interface OutlineHeaderActionsProps {
  isStreaming: boolean;
  isActive: boolean;
  isCompleted: boolean;
  isTruncated: boolean;
  lastTruncatedTask?: OutlineTask;
  hasOutline2AOutput: boolean;
  hasOutline2BOutput: boolean;
  hasOutlineOutput: boolean;
  onStop: () => void;
  onGenerate: () => void;
  onResumeTask: (task: OutlineTask) => void;
  onRetryTask: (task: OutlineTask) => void;
  onProceedPhase3: () => void;
}

export function OutlineHeaderActions({
  isStreaming,
  isActive,
  isCompleted,
  isTruncated,
  lastTruncatedTask,
  hasOutline2AOutput,
  hasOutline2BOutput,
  hasOutlineOutput,
  onStop,
  onGenerate,
  onResumeTask,
  onRetryTask,
  onProceedPhase3,
}: OutlineHeaderActionsProps) {
  if (isStreaming) {
    return (
      <Button variant="destructive" size="sm" onClick={onStop}>
        <StopCircle className="size-4 mr-2" /> Stop
      </Button>
    );
  }

  return (
    <>
      <Button
        size="sm"
        onClick={onGenerate}
        className={isActive && !isCompleted ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : ''}
      >
        {isCompleted ? <RefreshCw className="size-4 mr-2" /> : (isActive ? <FastForward className="size-4 mr-2" /> : <Play className="size-4 mr-2" />)}
        {isCompleted ? 'Regenerate 2A+2B' : 'Generate 2A+2B'}
      </Button>
      <Button
        size="sm"
        variant={isTruncated && lastTruncatedTask === '2A' ? 'secondary' : 'outline'}
        disabled={!hasOutline2AOutput}
        onClick={() => onResumeTask('2A')}
      >
        Resume 2A
      </Button>
      <Button
        size="sm"
        variant={isTruncated && lastTruncatedTask === '2B' ? 'secondary' : 'outline'}
        disabled={!hasOutline2BOutput}
        onClick={() => onResumeTask('2B')}
      >
        Resume 2B
      </Button>
      {hasOutlineOutput && (
        <>
          <Button size="sm" variant="outline" onClick={() => onRetryTask('2A')}>
            Retry 2A
          </Button>
          <Button size="sm" variant="outline" onClick={() => onRetryTask('2B')}>
            Retry 2B
          </Button>
          <Button size="sm" variant="secondary" onClick={onProceedPhase3}>
            Proceed to Phase 3
          </Button>
        </>
      )}
    </>
  );
}
