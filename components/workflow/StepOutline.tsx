'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, StopCircle, RefreshCw, FastForward } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export const StepOutline: React.FC = () => {
  const { steps, currentStepId } = useWorkflowStore();
  const { generate, stop } = useStepGenerator();
  const [plotDirection, setPlotDirection] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
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
            <Button variant="destructive" size="sm" onClick={stop}>
              <StopCircle className="size-4 mr-2" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={() => generate('outline', plotDirection)} className={isActive && !isCompleted ? "bg-cyan-600 hover:bg-cyan-700 text-white" : ""}>
              {isCompleted ? <RefreshCw className="size-4 mr-2" /> : (isActive ? <FastForward className="size-4 mr-2" /> : <Play className="size-4 mr-2" />)}
              {isCompleted ? 'Regenerate' : (isActive ? 'Generate & Continue' : 'Generate Outline')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-mono text-cyan-500 font-bold">
            {isActive && !isCompleted ? 'ACTION REQUIRED: Plot Direction / Notes' : 'OPTIONAL: Plot Direction / Notes'}
          </Label>
          <Input 
            ref={inputRef}
            placeholder="e.g., Make the protagonist more aggressive, introduce a plot twist..." 
            value={plotDirection}
            onChange={(e) => setPlotDirection(e.target.value)}
            className="bg-card/50 border-cyan-500/30 focus-visible:border-cyan-500 transition-colors"
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
