'use client';

import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, StopCircle, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export const StepAnalysis: React.FC = () => {
  const { steps } = useWorkflowStore();
  const { generate, stop } = useStepGenerator();
  
  const step = steps.analysis;
  const isStreaming = step.status === 'streaming';
  const isCompleted = step.status === 'completed';

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold uppercase tracking-wider">Step 1: Novel Analysis</CardTitle>
        <div className="flex gap-2">
          {isStreaming ? (
            <Button variant="destructive" size="sm" onClick={stop}>
              <StopCircle className="size-4 mr-2" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={() => generate('analysis')}>
              {isCompleted ? <RefreshCw className="size-4 mr-2" /> : <Play className="size-4 mr-2" />}
              {isCompleted ? 'Regenerate' : 'Start Analysis'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Textarea 
          readOnly 
          value={step.content} 
          placeholder="Analysis output will appear here..."
          className="min-h-[200px] font-mono text-sm bg-card/50 resize-y focus-visible:ring-0"
        />
        {step.error && (
          <p className="text-destructive text-xs mt-2 font-mono">ERROR: {step.error}</p>
        )}
      </CardContent>
    </Card>
  );
};
