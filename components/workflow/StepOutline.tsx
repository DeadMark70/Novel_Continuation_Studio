'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { useStepOutlineController } from '@/hooks/useStepOutlineController';
import { OutlineHeaderActions } from '@/components/workflow/outline/OutlineHeaderActions';
import { OutlineTargetSettings } from '@/components/workflow/outline/OutlineTargetSettings';
import { OutlinePacingSettings } from '@/components/workflow/outline/OutlinePacingSettings';
import { OutlineOutputPanels } from '@/components/workflow/outline/OutlineOutputPanels';

export const StepOutline: React.FC = () => {
  const {
    step,
    inputRef,
    isStreaming,
    isCompleted,
    isActive,
    modeMeta,
    modeClass,
    parsedOutline,
    hasStructuredOutline,
    hasOutlineOutput,
    hasOutline2AOutput,
    hasOutline2BOutput,
    hasMissingSections,
    isTruncated,
    lastTruncatedTask,
    outlineDirection,
    setOutlineDirection,
    storyWordCountInput,
    setStoryWordCountInput,
    chapterCountInput,
    setChapterCountInput,
    plotPercentInput,
    setPlotPercentInput,
    curveStartInput,
    setCurveStartInput,
    curveEndInput,
    setCurveEndInput,
    sceneLimitInput,
    setSceneLimitInput,
    pacingMode,
    plotPercent,
    curvePlotPercentStart,
    curvePlotPercentEnd,
    setPacingSettings,
    commitStoryWordCount,
    commitTargetChapterCount,
    commitPlotPercent,
    commitCurveStart,
    commitCurveEnd,
    commitSceneLimit,
    pendingResumeTask,
    setPendingResumeTask,
    confirmPendingResumeTask,
    handleManualResumeTask,
    generateOutline,
    retryOutlineTask,
    proceedToBreakdown,
    stop,
    minTargetStoryWordCount,
    maxTargetStoryWordCount,
    minTargetChapterCount,
    maxTargetChapterCount,
  } = useStepOutlineController();

  return (
    <Card className="border-l-4 border-l-cyan-500 bg-cyan-500/5">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-bold uppercase tracking-wider flex items-center gap-2">
            Step 2: Outline Generation
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${modeClass}`}>
              {modeMeta.badge}
            </span>
            {isActive && !isCompleted && !isStreaming && (
              <span className="text-[10px] bg-cyan-500 text-white px-2 py-0.5 rounded-full animate-pulse">Waiting for Input</span>
            )}
          </CardTitle>
          <CardDescription className="mt-1 text-xs">{modeMeta.detail}</CardDescription>
        </div>
        <div className="flex gap-2">
          <OutlineHeaderActions
            isStreaming={isStreaming}
            isActive={isActive}
            isCompleted={isCompleted}
            isTruncated={isTruncated}
            lastTruncatedTask={lastTruncatedTask}
            hasOutline2AOutput={hasOutline2AOutput}
            hasOutline2BOutput={hasOutline2BOutput}
            hasOutlineOutput={hasOutlineOutput}
            onStop={stop}
            onGenerate={generateOutline}
            onResumeTask={handleManualResumeTask}
            onRetryTask={retryOutlineTask}
            onProceedPhase3={proceedToBreakdown}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`rounded-md border px-3 py-2 text-xs ${isTruncated ? 'border-amber-400/40 bg-amber-500/10 text-amber-200' : 'border-border/60 bg-card/30 text-muted-foreground'}`}>
          {isTruncated
            ? `Detected length truncation. Use Resume 2A / Resume 2B to continue the specific subtask.${lastTruncatedTask ? ` Last truncated: ${lastTruncatedTask}.` : ''}`
            : hasOutlineOutput
              ? 'Manual resume is available per subtask. If no truncation occurred, continuing may duplicate content.'
              : 'Resume 2A / Resume 2B will be enabled after corresponding output exists.'}
        </div>

        <OutlineTargetSettings
          storyWordCountInput={storyWordCountInput}
          chapterCountInput={chapterCountInput}
          minTargetStoryWordCount={minTargetStoryWordCount}
          maxTargetStoryWordCount={maxTargetStoryWordCount}
          minTargetChapterCount={minTargetChapterCount}
          maxTargetChapterCount={maxTargetChapterCount}
          onStoryWordCountInputChange={setStoryWordCountInput}
          onStoryWordCountCommit={(value) => {
            void commitStoryWordCount(value);
          }}
          onChapterCountInputChange={setChapterCountInput}
          onChapterCountCommit={(value) => {
            void commitTargetChapterCount(value);
          }}
        />

        <OutlinePacingSettings
          pacingMode={pacingMode}
          plotPercentInput={plotPercentInput}
          curveStartInput={curveStartInput}
          curveEndInput={curveEndInput}
          sceneLimitInput={sceneLimitInput}
          plotPercent={plotPercent}
          curvePlotPercentStart={curvePlotPercentStart}
          curvePlotPercentEnd={curvePlotPercentEnd}
          onSetPacingMode={(mode) => {
            void setPacingSettings({ pacingMode: mode });
          }}
          onPlotPercentInputChange={setPlotPercentInput}
          onPlotPercentCommit={(value) => {
            void commitPlotPercent(value);
          }}
          onCurveStartInputChange={setCurveStartInput}
          onCurveStartCommit={(value) => {
            void commitCurveStart(value);
          }}
          onCurveEndInputChange={setCurveEndInput}
          onCurveEndCommit={(value) => {
            void commitCurveEnd(value);
          }}
          onSceneLimitInputChange={setSceneLimitInput}
          onSceneLimitCommit={(value) => {
            void commitSceneLimit(value);
          }}
        />

        <div className="space-y-2">
          <Label className="text-xs font-mono text-cyan-500 font-bold">
            {isActive && !isCompleted ? 'ACTION REQUIRED: Plot Direction / Notes' : 'OPTIONAL: Plot Direction / Notes'}
          </Label>
          <Textarea
            ref={inputRef}
            placeholder="e.g., Make the protagonist more aggressive, introduce a plot twist..."
            value={outlineDirection}
            onChange={(event) => {
              void setOutlineDirection(event.target.value);
            }}
            className="min-h-[90px] bg-card/50 border-cyan-500/30 focus-visible:border-cyan-500 transition-colors resize-y"
          />
          {isActive && !isCompleted && (
            <p className="text-[10px] text-muted-foreground italic">Provide direction and click &quot;Generate 2A+2B&quot; to run Phase 2 subtasks.</p>
          )}
        </div>

        {hasMissingSections && (
          <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" />
              Outline incomplete. You can retry 2A/2B or proceed manually.
            </div>
            {parsedOutline.missing2A.length > 0 && (
              <p className="mt-1 font-mono">2A missing: {parsedOutline.missing2A.map((label) => `【${label}】`).join('、')}</p>
            )}
            {parsedOutline.missing2B.length > 0 && (
              <p className="mt-1 font-mono">2B missing: {parsedOutline.missing2B.map((label) => `【${label}】`).join('、')}</p>
            )}
          </div>
        )}

        <OutlineOutputPanels
          hasStructuredOutline={hasStructuredOutline}
          part2A={parsedOutline.part2A}
          part2B={parsedOutline.part2B}
          rawContent={step.content}
          stepError={step.error}
        />
      </CardContent>
      <Dialog
        open={pendingResumeTask !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingResumeTask(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Continue Without Truncation?</DialogTitle>
            <DialogDescription>
              No length truncation was detected in the last run. Continuing may duplicate content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingResumeTask(null)}>
              Cancel
            </Button>
            <Button onClick={confirmPendingResumeTask}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
