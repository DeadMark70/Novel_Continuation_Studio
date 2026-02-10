'use client';

import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Play, StopCircle, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export const StepBreakdown: React.FC = () => {
  const { steps } = useWorkflowStore();
  const { targetChapterCount } = useNovelStore();
  const { generate, stop } = useStepGenerator();
  
  const step = steps.breakdown;
  const isStreaming = step.status === 'streaming';
  const isCompleted = step.status === 'completed';

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
          <Label className="text-xs font-mono text-amber-500 font-bold">
            TARGET CHAPTER COUNT (FROM PHASE 2)
          </Label>
          <p className="text-sm font-mono text-amber-400">{targetChapterCount} chapters</p>
          <p className="text-xs text-muted-foreground">
            Adjust target chapter count in Phase 2 before generating outline. Phase 3 will auto-run with that value.
          </p>
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
