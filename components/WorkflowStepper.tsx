'use client';

import React, { useEffect } from 'react';
import { useWorkflowStore, WorkflowStepId } from '@/store/useWorkflowStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { StepAnalysis } from './workflow/StepAnalysis';
import { StepOutline } from './workflow/StepOutline';
import { StepBreakdown } from './workflow/StepBreakdown';
import { StepChapter1 } from './workflow/StepChapter1';
import { StepContinuation } from './workflow/StepContinuation';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const WorkflowStepper: React.FC = () => {
  const { steps, currentStepId, autoTriggerStepId, clearAutoTrigger } = useWorkflowStore();
  const { generate } = useStepGenerator();

  // Automation Effect
  useEffect(() => {
    if (autoTriggerStepId) {
      console.log(`[Automation] Triggering step: ${autoTriggerStepId}`);
      generate(autoTriggerStepId);
      // clearAutoTrigger is handled inside startStep which is called by generate
    }
  }, [autoTriggerStepId, generate]);

  const getStatusIcon = (stepId: WorkflowStepId) => {
    const status = steps[stepId].status;
    if (status === 'streaming') return <Loader2 className="size-4 animate-spin text-primary" />;
    if (status === 'completed') return <CheckCircle2 className="size-4 text-green-500" />;
    if (status === 'error') return <AlertCircle className="size-4 text-destructive" />;
    return <Circle className="size-4 text-muted-foreground" />;
  };

  return (
    <div className="w-full space-y-4">
      <Accordion type="single" collapsible defaultValue="analysis" value={currentStepId} className="w-full space-y-2 border-none">
        <AccordionItem value="analysis" className="border rounded-lg bg-card/30 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-card/50">
            <div className="flex items-center gap-3">
              {getStatusIcon('analysis')}
              <span className={cn("text-sm font-bold uppercase tracking-widest", steps.analysis.status === 'idle' && "text-muted-foreground")}>
                Phase I: Analysis
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-0">
            <StepAnalysis />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="outline" className="border rounded-lg bg-card/30 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-card/50">
            <div className="flex items-center gap-3">
              {getStatusIcon('outline')}
              <span className={cn("text-sm font-bold uppercase tracking-widest", steps.outline.status === 'idle' && "text-muted-foreground")}>
                Phase II: Story Outline
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-0">
            <StepOutline />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="breakdown" className="border rounded-lg bg-card/30 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-card/50">
            <div className="flex items-center gap-3">
              {getStatusIcon('breakdown')}
              <span className={cn("text-sm font-bold uppercase tracking-widest", steps.breakdown.status === 'idle' && "text-muted-foreground")}>
                Phase III: Chapter Breakdown
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-0">
            <StepBreakdown />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="chapter1" className="border rounded-lg bg-card/30 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-card/50">
            <div className="flex items-center gap-3">
              {getStatusIcon('chapter1')}
              <span className={cn("text-sm font-bold uppercase tracking-widest", steps.chapter1.status === 'idle' && "text-muted-foreground")}>
                Phase IV: The First Chapter
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-0">
            <StepChapter1 />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="continuation" className="border rounded-lg bg-card/30 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-card/50">
            <div className="flex items-center gap-3">
              {getStatusIcon('continuation')}
              <span className={cn("text-sm font-bold uppercase tracking-widest", steps.continuation.status === 'idle' && "text-muted-foreground")}>
                Phase V: Perpetual Generation
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-0">
            <StepContinuation />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
