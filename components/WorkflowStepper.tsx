'use client';

import React, { useEffect } from 'react';
import { useWorkflowStore, WorkflowStepId } from '@/store/useWorkflowStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { StepCompression } from './workflow/StepCompression';
import { StepAnalysis } from './workflow/StepAnalysis';
import { StepOutline } from './workflow/StepOutline';
import { StepBreakdown } from './workflow/StepBreakdown';
import { StepChapter1 } from './workflow/StepChapter1';
import { StepContinuation } from './workflow/StepContinuation';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveWorkflowMode } from '@/lib/workflow-mode';

export const WorkflowStepper: React.FC = () => {
  const { steps, currentStepId, autoTriggerStepId, clearAutoTrigger, setCurrentStep } = useWorkflowStore();
  const { compressionMode, compressionAutoThreshold } = useSettingsStore(
    useShallow((state) => ({
      compressionMode: state.compressionMode,
      compressionAutoThreshold: state.compressionAutoThreshold,
    }))
  );
  const { wordCount, compressedContext } = useNovelStore(
    useShallow((state) => ({
      wordCount: state.wordCount,
      compressedContext: state.compressedContext,
    }))
  );
  const { generate } = useStepGenerator();

  // Automation Effect
  useEffect(() => {
    if (autoTriggerStepId) {
      // ✅ Safeguard: Check global isGenerating mutex lock first
      const { isGenerating } = useWorkflowStore.getState();
      if (isGenerating) {
        console.warn(`[Automation] Cannot trigger ${autoTriggerStepId}: Global isGenerating lock is active. Clearing autoTrigger.`);
        clearAutoTrigger();
        return;
      }

      // Also check streaming status as backup
      const isAnyStepStreaming = Object.values(steps).some(step => step.status === 'streaming');
      if (isAnyStepStreaming) {
        console.warn(`[Automation] Cannot trigger ${autoTriggerStepId}: Another step is still streaming. Clearing autoTrigger.`);
        clearAutoTrigger();
        return;
      }

      console.log(`[Automation] Triggering step: ${autoTriggerStepId}`);
      // Add a small delay to ensure state updates utilize fresh closures and UI is ready
      const timer = setTimeout(() => {
        // Double-check both locks before actually generating
        const state = useWorkflowStore.getState();
        if (state.isGenerating) {
          console.warn(`[Automation] Aborted trigger for ${autoTriggerStepId}: isGenerating became true during delay.`);
          return;
        }
        const stillStreaming = Object.values(state.steps).some(s => s.status === 'streaming');
        if (stillStreaming) {
          console.warn(`[Automation] Aborted trigger for ${autoTriggerStepId}: State changed to streaming during delay.`);
          return;
        }
        generate(autoTriggerStepId);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoTriggerStepId, generate, steps, clearAutoTrigger]);

  const getStatusIcon = (stepId: WorkflowStepId) => {
    const status = steps[stepId].status;
    if (status === 'streaming') return <Loader2 className="size-4 animate-spin text-primary" />;
    if (status === 'completed') return <CheckCircle2 className="size-4 text-green-500" />;
    if (status === 'error') return <AlertCircle className="size-4 text-destructive" />;
    return <Circle className="size-4 text-muted-foreground" />;
  };

  const getModeMeta = (stepId: WorkflowStepId) =>
    resolveWorkflowMode({
      stepId,
      compressionMode,
      compressionAutoThreshold,
      sourceChars: wordCount,
      compressedContext,
    });

  const getModeBadgeClass = (stepId: WorkflowStepId) => {
    const mode = getModeMeta(stepId);
    if (mode.badge === 'OFF' || mode.badge === 'AUTO-SKIP' || mode.badge === 'RAW') {
      return 'bg-zinc-700/30 text-zinc-300 border-zinc-500/30';
    }
    return 'bg-sky-600/20 text-sky-300 border-sky-400/40';
  };

  return (
    <div className="w-full space-y-4">
      <Accordion 
        type="single" 
        collapsible 
        defaultValue="compression" 
        value={currentStepId} 
        onValueChange={(val) => setCurrentStep(val as WorkflowStepId)}
        className="w-full space-y-2 border-none"
      >
        <AccordionItem value="compression" className="border rounded-lg bg-card/30 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-card/50">
            <div className="flex items-center gap-3">
              {getStatusIcon('compression')}
              <span className={cn("text-sm font-bold uppercase tracking-widest", steps.compression.status === 'idle' && "text-muted-foreground")}>
                Phase 0: Compression
              </span>
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-mono', getModeBadgeClass('compression'))}>
                {getModeMeta('compression').badge}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-0">
            <StepCompression />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="analysis" className="border rounded-lg bg-card/30 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-card/50">
            <div className="flex items-center gap-3">
              {getStatusIcon('analysis')}
              <span className={cn("text-sm font-bold uppercase tracking-widest", steps.analysis.status === 'idle' && "text-muted-foreground")}>
                Phase I: Analysis
              </span>
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-mono', getModeBadgeClass('analysis'))}>
                {getModeMeta('analysis').badge}
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
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-mono', getModeBadgeClass('outline'))}>
                {getModeMeta('outline').badge}
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
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-mono', getModeBadgeClass('breakdown'))}>
                {getModeMeta('breakdown').badge}
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
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-mono', getModeBadgeClass('chapter1'))}>
                {getModeMeta('chapter1').badge}
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
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-mono', getModeBadgeClass('continuation'))}>
                {getModeMeta('continuation').badge}
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
