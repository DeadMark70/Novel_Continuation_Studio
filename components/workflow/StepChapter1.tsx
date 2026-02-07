'use client';

import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, StopCircle, RefreshCw, ArrowDownRight } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export const StepChapter1: React.FC = () => {
  const { steps, startStep } = useWorkflowStore();
  const { generate, stop } = useStepGenerator();
  
  const step = steps.chapter1;
  const isStreaming = step.status === 'streaming';
  const isCompleted = step.status === 'completed';

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold uppercase tracking-wider">Step 4: Chapter 1</CardTitle>
        <div className="flex gap-2">
          {isCompleted && (
             <Button size="sm" variant="outline" onClick={() => startStep('continuation')}>
               Proceed to Phase V <ArrowDownRight className="size-4 ml-2" />
             </Button>
          )}
          {isStreaming ? (
            <Button variant="destructive" size="sm" onClick={stop} disabled={step.status !== 'streaming'}>
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
