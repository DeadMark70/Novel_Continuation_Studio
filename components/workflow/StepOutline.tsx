'use client';

import React, { useState } from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, StopCircle, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export const StepOutline: React.FC = () => {
  const { steps } = useWorkflowStore();
  const { generate, stop } = useStepGenerator();
  const [plotDirection, setPlotDirection] = useState('');
  
  const step = steps.outline;
  const isStreaming = step.status === 'streaming';
  const isCompleted = step.status === 'completed';

  return (
    <Card className="border-l-4 border-l-cyan-500">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold uppercase tracking-wider">Step 2: Outline Generation</CardTitle>
        <div className="flex gap-2">
          {isStreaming ? (
            <Button variant="destructive" size="sm" onClick={stop}>
              <StopCircle className="size-4 mr-2" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={() => generate('outline', plotDirection)}>
              {isCompleted ? <RefreshCw className="size-4 mr-2" /> : <Play className="size-4 mr-2" />}
              {isCompleted ? 'Regenerate' : 'Generate Outline'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-mono text-cyan-500">OPTIONAL: Plot Direction / Notes</Label>
          <Input 
            placeholder="e.g., Make the protagonist more aggressive, introduce a plot twist..." 
            value={plotDirection}
            onChange={(e) => setPlotDirection(e.target.value)}
            className="bg-card/50"
          />
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
