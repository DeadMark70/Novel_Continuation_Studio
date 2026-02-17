'use client';

import React, { useEffect, useRef } from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, StopCircle, RefreshCw, FastForward, AlertTriangle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { resolveWorkflowMode } from '@/lib/workflow-mode';
import {
  buildOutlineTaskDirective,
  parseOutlinePhase2Content,
} from '@/lib/outline-phase2';
import { appendResumeLastOutputDirective } from '@/lib/resume-directive';

const MIN_TARGET_STORY_WORD_COUNT = 5000;
const MAX_TARGET_STORY_WORD_COUNT = 50000;
const MIN_TARGET_CHAPTER_COUNT = 3;
const MAX_TARGET_CHAPTER_COUNT = 20;

function clampStoryWordCount(value: number): number {
  return Math.max(MIN_TARGET_STORY_WORD_COUNT, Math.min(MAX_TARGET_STORY_WORD_COUNT, value));
}

function clampChapterCount(value: number): number {
  return Math.max(MIN_TARGET_CHAPTER_COUNT, Math.min(MAX_TARGET_CHAPTER_COUNT, value));
}

export const StepOutline: React.FC = () => {
  const step = useWorkflowStore((state) => state.steps.outline);
  const currentStepId = useWorkflowStore((state) => state.currentStepId);
  const { compressionMode, compressionAutoThreshold } = useSettingsStore(
    useShallow((state) => ({
      compressionMode: state.compressionMode,
      compressionAutoThreshold: state.compressionAutoThreshold,
    }))
  );
  const {
    outlineDirection,
    setOutlineDirection,
    targetStoryWordCount,
    setTargetStoryWordCount,
    targetChapterCount,
    setTargetChapterCount,
    pacingMode,
    plotPercent,
    curvePlotPercentStart,
    curvePlotPercentEnd,
    eroticSceneLimitPerChapter,
    setPacingSettings,
    wordCount,
    compressedContext,
  } = useNovelStore(
    useShallow((state) => ({
      outlineDirection: state.outlineDirection,
      setOutlineDirection: state.setOutlineDirection,
      targetStoryWordCount: state.targetStoryWordCount,
      setTargetStoryWordCount: state.setTargetStoryWordCount,
      targetChapterCount: state.targetChapterCount,
      setTargetChapterCount: state.setTargetChapterCount,
      pacingMode: state.pacingMode,
      plotPercent: state.plotPercent,
      curvePlotPercentStart: state.curvePlotPercentStart,
      curvePlotPercentEnd: state.curvePlotPercentEnd,
      eroticSceneLimitPerChapter: state.eroticSceneLimitPerChapter,
      setPacingSettings: state.setPacingSettings,
      wordCount: state.wordCount,
      compressedContext: state.compressedContext,
    }))
  );
  const { generate, stop } = useStepGenerator();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [storyWordCountInput, setStoryWordCountInput] = React.useState(targetStoryWordCount.toString());
  const [chapterCountInput, setChapterCountInput] = React.useState(targetChapterCount.toString());
  const [plotPercentInput, setPlotPercentInput] = React.useState(plotPercent.toString());
  const [curveStartInput, setCurveStartInput] = React.useState(curvePlotPercentStart.toString());
  const [curveEndInput, setCurveEndInput] = React.useState(curvePlotPercentEnd.toString());
  const [sceneLimitInput, setSceneLimitInput] = React.useState(eroticSceneLimitPerChapter.toString());
  const [pendingResumeTask, setPendingResumeTask] = React.useState<'2A' | '2B' | null>(null);
  
  const isStreaming = step.status === 'streaming';
  const isCompleted = step.status === 'completed';
  const isActive = currentStepId === 'outline';
  const parsedOutline = React.useMemo(() => parseOutlinePhase2Content(step.content), [step.content]);
  const hasStructuredOutline = parsedOutline.structured;
  const hasOutlineOutput = Boolean(
    parsedOutline.part2A.trim() ||
    parsedOutline.part2B.trim() ||
    parsedOutline.rawLegacyContent.trim()
  );
  const hasOutline2AOutput = Boolean(parsedOutline.part2A.trim() || parsedOutline.rawLegacyContent.trim());
  const hasOutline2BOutput = Boolean(parsedOutline.part2B.trim());
  const hasMissingSections = parsedOutline.missing2A.length > 0 || parsedOutline.missing2B.length > 0;
  const isTruncated = step.truncation.isTruncated;
  const lastTruncatedTask = step.truncation.lastTruncatedOutlineTask;
  const modeMeta = resolveWorkflowMode({
    stepId: 'outline',
    compressionMode,
    compressionAutoThreshold,
    sourceChars: wordCount,
    compressedContext,
  });
  const modeClass = modeMeta.isCompressed
    ? 'border-cyan-400/40 bg-cyan-600/20 text-cyan-200'
    : 'border-zinc-500/30 bg-zinc-700/30 text-zinc-200';

  // Autofocus when this step becomes active and isn't completed yet
  useEffect(() => {
    if (isActive && !isCompleted && !isStreaming) {
      inputRef.current?.focus();
    }
  }, [isActive, isCompleted, isStreaming]);

  useEffect(() => {
    setStoryWordCountInput(targetStoryWordCount.toString());
  }, [targetStoryWordCount]);

  useEffect(() => {
    setChapterCountInput(targetChapterCount.toString());
  }, [targetChapterCount]);

  useEffect(() => {
    setPlotPercentInput(plotPercent.toString());
  }, [plotPercent]);

  useEffect(() => {
    setCurveStartInput(curvePlotPercentStart.toString());
  }, [curvePlotPercentStart]);

  useEffect(() => {
    setCurveEndInput(curvePlotPercentEnd.toString());
  }, [curvePlotPercentEnd]);

  useEffect(() => {
    setSceneLimitInput(eroticSceneLimitPerChapter.toString());
  }, [eroticSceneLimitPerChapter]);

  const commitStoryWordCount = async (rawValue: string) => {
    const parsed = parseInt(rawValue, 10);
    const safeValue = Number.isFinite(parsed) ? clampStoryWordCount(parsed) : targetStoryWordCount;
    setStoryWordCountInput(safeValue.toString());
    await setTargetStoryWordCount(safeValue);
  };

  const commitTargetChapterCount = async (rawValue: string) => {
    const parsed = parseInt(rawValue, 10);
    const safeValue = Number.isFinite(parsed) ? clampChapterCount(parsed) : targetChapterCount;
    setChapterCountInput(safeValue.toString());
    await setTargetChapterCount(safeValue);
  };

  const clampPercent = (value: number, fallback: number): number => {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(0, Math.min(100, Math.floor(value)));
  };

  const clampSceneLimit = (value: number, fallback: number): number => {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(0, Math.min(8, Math.floor(value)));
  };

  const commitPlotPercent = async (rawValue: string) => {
    const parsed = parseInt(rawValue, 10);
    const safeValue = clampPercent(parsed, plotPercent);
    setPlotPercentInput(safeValue.toString());
    await setPacingSettings({ plotPercent: safeValue });
  };

  const commitCurveStart = async (rawValue: string) => {
    const parsed = parseInt(rawValue, 10);
    const safeValue = clampPercent(parsed, curvePlotPercentStart);
    setCurveStartInput(safeValue.toString());
    await setPacingSettings({ curvePlotPercentStart: safeValue });
  };

  const commitCurveEnd = async (rawValue: string) => {
    const parsed = parseInt(rawValue, 10);
    const safeValue = clampPercent(parsed, curvePlotPercentEnd);
    setCurveEndInput(safeValue.toString());
    await setPacingSettings({ curvePlotPercentEnd: safeValue });
  };

  const commitSceneLimit = async (rawValue: string) => {
    const parsed = parseInt(rawValue, 10);
    const safeValue = clampSceneLimit(parsed, eroticSceneLimitPerChapter);
    setSceneLimitInput(safeValue.toString());
    await setPacingSettings({ eroticSceneLimitPerChapter: safeValue });
  };

  const runManualResumeTask = (task: '2A' | '2B') => {
    const hasTaskOutput = task === '2A' ? hasOutline2AOutput : hasOutline2BOutput;
    if (!hasTaskOutput) {
      return;
    }

    const taskScopedNotes = buildOutlineTaskDirective(outlineDirection, task);
    generate('outline', appendResumeLastOutputDirective(taskScopedNotes));
  };

  const handleManualResumeTask = (task: '2A' | '2B') => {
    const hasTaskOutput = task === '2A' ? hasOutline2AOutput : hasOutline2BOutput;
    if (!hasTaskOutput) {
      return;
    }
    if (!isTruncated) {
      setPendingResumeTask(task);
      return;
    }
    runManualResumeTask(task);
  };

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
          {isStreaming ? (
            <Button variant="destructive" size="sm" onClick={stop}>
              <StopCircle className="size-4 mr-2" /> Stop
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={() => {
                console.log('[StepOutline] Generate button clicked. plotDirection:', outlineDirection);
                generate('outline', outlineDirection);
              }} className={isActive && !isCompleted ? "bg-cyan-600 hover:bg-cyan-700 text-white" : ""}>
                {isCompleted ? <RefreshCw className="size-4 mr-2" /> : (isActive ? <FastForward className="size-4 mr-2" /> : <Play className="size-4 mr-2" />)}
                {isCompleted ? 'Regenerate 2A+2B' : 'Generate 2A+2B'}
              </Button>
              <Button
                size="sm"
                variant={isTruncated && lastTruncatedTask === '2A' ? 'secondary' : 'outline'}
                disabled={!hasOutline2AOutput}
                onClick={() => handleManualResumeTask('2A')}
              >
                Resume 2A
              </Button>
              <Button
                size="sm"
                variant={isTruncated && lastTruncatedTask === '2B' ? 'secondary' : 'outline'}
                disabled={!hasOutline2BOutput}
                onClick={() => handleManualResumeTask('2B')}
              >
                Resume 2B
              </Button>
              {hasOutlineOutput && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generate('outline', buildOutlineTaskDirective(outlineDirection, '2A'))}
                  >
                    Retry 2A
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generate('outline', buildOutlineTaskDirective(outlineDirection, '2B'))}
                  >
                    Retry 2B
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => generate('breakdown')}>
                    Proceed to Phase 3
                  </Button>
                </>
              )}
            </>
          )}
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

        <div className="space-y-2 rounded-lg border border-cyan-500/20 bg-card/30 p-3">
          <Label htmlFor="target-story-word-count" className="text-xs font-mono text-cyan-500 font-bold">
            TARGET STORY WORD COUNT
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="target-story-word-count"
              type="number"
              min={MIN_TARGET_STORY_WORD_COUNT}
              max={MAX_TARGET_STORY_WORD_COUNT}
              step={500}
              value={storyWordCountInput}
              onChange={(event) => setStoryWordCountInput(event.target.value)}
              onBlur={() => void commitStoryWordCount(storyWordCountInput)}
              className="w-40"
            />
            <span className="text-xs text-muted-foreground">
              Range: {MIN_TARGET_STORY_WORD_COUNT}-{MAX_TARGET_STORY_WORD_COUNT}
            </span>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-cyan-500/20 bg-card/30 p-3">
          <Label htmlFor="target-chapter-count" className="text-xs font-mono text-cyan-500 font-bold">
            TARGET CHAPTER COUNT (FOR PHASE 3)
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="target-chapter-count"
              type="number"
              min={MIN_TARGET_CHAPTER_COUNT}
              max={MAX_TARGET_CHAPTER_COUNT}
              step={1}
              value={chapterCountInput}
              onChange={(event) => setChapterCountInput(event.target.value)}
              onBlur={() => void commitTargetChapterCount(chapterCountInput)}
              className="w-32"
            />
            <span className="text-xs text-muted-foreground">
              Range: {MIN_TARGET_CHAPTER_COUNT}-{MAX_TARGET_CHAPTER_COUNT}
            </span>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-cyan-500/20 bg-card/30 p-3">
          <Label className="text-xs font-mono text-cyan-500 font-bold">
            PACING RATIO MODE (PLOT VS EROTIC)
          </Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={pacingMode === 'fixed' ? 'default' : 'outline'}
              onClick={() => void setPacingSettings({ pacingMode: 'fixed' })}
            >
              Fixed
            </Button>
            <Button
              type="button"
              size="sm"
              variant={pacingMode === 'curve' ? 'default' : 'outline'}
              onClick={() => void setPacingSettings({ pacingMode: 'curve' })}
            >
              Curve (Warm Up)
            </Button>
          </div>

          {pacingMode === 'fixed' ? (
            <div className="space-y-2">
              <Label htmlFor="plot-percent" className="text-xs font-mono">Plot % (Erotic % = 100 - Plot %)</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="plot-percent"
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={plotPercentInput}
                  onChange={(event) => setPlotPercentInput(event.target.value)}
                  onBlur={() => void commitPlotPercent(plotPercentInput)}
                  className="w-32"
                />
                <span className="text-xs text-muted-foreground">
                  Current: {plotPercent}/{100 - plotPercent}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="curve-start" className="text-xs font-mono">Early Plot %</Label>
                <Input
                  id="curve-start"
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={curveStartInput}
                  onChange={(event) => setCurveStartInput(event.target.value)}
                  onBlur={() => void commitCurveStart(curveStartInput)}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">Early ratio: {curvePlotPercentStart}/{100 - curvePlotPercentStart}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="curve-end" className="text-xs font-mono">Late Plot %</Label>
                <Input
                  id="curve-end"
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={curveEndInput}
                  onChange={(event) => setCurveEndInput(event.target.value)}
                  onBlur={() => void commitCurveEnd(curveEndInput)}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">Late ratio: {curvePlotPercentEnd}/{100 - curvePlotPercentEnd}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="erotic-scene-limit" className="text-xs font-mono">
              EROTIC SCENE LIMIT PER CHAPTER
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="erotic-scene-limit"
                type="number"
                min={0}
                max={8}
                step={1}
                value={sceneLimitInput}
                onChange={(event) => setSceneLimitInput(event.target.value)}
                onBlur={() => void commitSceneLimit(sceneLimitInput)}
                className="w-24"
              />
              <span className="text-xs text-muted-foreground">
                0 means no explicit scene cap.
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-mono text-cyan-500 font-bold">
            {isActive && !isCompleted ? 'ACTION REQUIRED: Plot Direction / Notes' : 'OPTIONAL: Plot Direction / Notes'}
          </Label>
          <Textarea
            ref={inputRef}
            placeholder="e.g., Make the protagonist more aggressive, introduce a plot twist..." 
            value={outlineDirection}
            onChange={(e) => void setOutlineDirection(e.target.value)}
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

        {hasStructuredOutline ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-mono text-cyan-300">Phase 2A Output</Label>
              <Textarea
                readOnly
                value={parsedOutline.part2A}
                placeholder="Phase 2A output will appear here..."
                className="min-h-[220px] font-mono text-sm bg-card/50 resize-y focus-visible:ring-0"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-cyan-300">Phase 2B Output</Label>
              <Textarea
                readOnly
                value={parsedOutline.part2B}
                placeholder="Phase 2B output will appear here..."
                className="min-h-[220px] font-mono text-sm bg-card/50 resize-y focus-visible:ring-0"
              />
            </div>
          </div>
        ) : (
          <Textarea
            readOnly
            value={step.content}
            placeholder="Outline output will appear here..."
            className="min-h-[300px] font-mono text-sm bg-card/50 resize-y focus-visible:ring-0"
          />
        )}
        {step.error && (
          <p className="text-destructive text-xs mt-2 font-mono">ERROR: {step.error}</p>
        )}
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
            <Button
              onClick={() => {
                if (!pendingResumeTask) {
                  return;
                }
                runManualResumeTask(pendingResumeTask);
                setPendingResumeTask(null);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
