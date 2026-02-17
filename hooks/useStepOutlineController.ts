'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { resolveWorkflowMode } from '@/lib/workflow-mode';
import {
  buildOutlineTaskDirective,
  parseOutlinePhase2Content,
} from '@/lib/outline-phase2';
import { appendResumeLastOutputDirective } from '@/lib/resume-directive';

export type OutlineTask = '2A' | '2B';

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

function clampPercent(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.floor(value)));
}

function clampSceneLimit(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(8, Math.floor(value)));
}

export function useStepOutlineController() {
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
  const [pendingResumeTask, setPendingResumeTask] = React.useState<OutlineTask | null>(null);

  const isStreaming = step.status === 'streaming';
  const isCompleted = step.status === 'completed';
  const isActive = currentStepId === 'outline';
  const parsedOutline = useMemo(() => parseOutlinePhase2Content(step.content), [step.content]);
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

  const runManualResumeTask = (task: OutlineTask) => {
    const hasTaskOutput = task === '2A' ? hasOutline2AOutput : hasOutline2BOutput;
    if (!hasTaskOutput) {
      return;
    }

    const taskScopedNotes = buildOutlineTaskDirective(outlineDirection, task);
    generate('outline', appendResumeLastOutputDirective(taskScopedNotes));
  };

  const handleManualResumeTask = (task: OutlineTask) => {
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

  const confirmPendingResumeTask = () => {
    if (!pendingResumeTask) {
      return;
    }
    runManualResumeTask(pendingResumeTask);
    setPendingResumeTask(null);
  };

  const generateOutline = () => {
    generate('outline', outlineDirection);
  };

  const retryOutlineTask = (task: OutlineTask) => {
    generate('outline', buildOutlineTaskDirective(outlineDirection, task));
  };

  const proceedToBreakdown = () => {
    generate('breakdown');
  };

  return {
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
    targetStoryWordCount,
    targetChapterCount,
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
    minTargetStoryWordCount: MIN_TARGET_STORY_WORD_COUNT,
    maxTargetStoryWordCount: MAX_TARGET_STORY_WORD_COUNT,
    minTargetChapterCount: MIN_TARGET_CHAPTER_COUNT,
    maxTargetChapterCount: MAX_TARGET_CHAPTER_COUNT,
  };
}
