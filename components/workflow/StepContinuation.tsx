'use client';

import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, StopCircle, Repeat } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export const StepContinuation: React.FC = () => {
  const { steps } = useWorkflowStore();
  const { generate, stop } = useStepGenerator();
  // Loop mode not fully implemented in logic yet, but UI can have it
  // For "continue", we just re-run generation which appends to chapters in store (logic needs to handle appending)
  // Currently, our store keeps overwriting "continuation" content. 
  // We need logic to "Commit" a chapter to the `chapters` array in NovelStore.
  
  const step = steps.continuation;
  const isStreaming = step.status === 'streaming';
  const isCompleted = step.status === 'completed';

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold uppercase tracking-wider">Step 5: Continuation</CardTitle>
        <div className="flex gap-2">
          {isStreaming ? (
            <Button variant="destructive" size="sm" onClick={stop}>
              <StopCircle className="size-4 mr-2" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={() => generate('continuation')}>
              {isCompleted ? <Repeat className="size-4 mr-2" /> : <Play className="size-4 mr-2" />}
              {isCompleted ? 'Continue (Next Chapter)' : 'Start Continuation'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Textarea 
          readOnly 
          value={step.content} 
          placeholder="New chapter content will appear here..."
          className="min-h-[400px] font-mono text-sm bg-card/50 resize-y focus-visible:ring-0"
        />
        {step.error && (
          <p className="text-destructive text-xs mt-2 font-mono">ERROR: {step.error}</p>
        )}
      </CardContent>
    </Card>
  );
};
