'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OutlineTargetSettingsProps {
  storyWordCountInput: string;
  chapterCountInput: string;
  minTargetStoryWordCount: number;
  maxTargetStoryWordCount: number;
  minTargetChapterCount: number;
  maxTargetChapterCount: number;
  onStoryWordCountInputChange: (value: string) => void;
  onStoryWordCountCommit: (value: string) => void;
  onChapterCountInputChange: (value: string) => void;
  onChapterCountCommit: (value: string) => void;
}

export function OutlineTargetSettings({
  storyWordCountInput,
  chapterCountInput,
  minTargetStoryWordCount,
  maxTargetStoryWordCount,
  minTargetChapterCount,
  maxTargetChapterCount,
  onStoryWordCountInputChange,
  onStoryWordCountCommit,
  onChapterCountInputChange,
  onChapterCountCommit,
}: OutlineTargetSettingsProps) {
  return (
    <>
      <div className="space-y-2 rounded-lg border border-cyan-500/20 bg-card/30 p-3">
        <Label htmlFor="target-story-word-count" className="text-xs font-mono text-cyan-500 font-bold">
          TARGET STORY WORD COUNT
        </Label>
        <div className="flex items-center gap-3">
          <Input
            id="target-story-word-count"
            type="number"
            min={minTargetStoryWordCount}
            max={maxTargetStoryWordCount}
            step={500}
            value={storyWordCountInput}
            onChange={(event) => onStoryWordCountInputChange(event.target.value)}
            onBlur={() => onStoryWordCountCommit(storyWordCountInput)}
            className="w-40"
          />
          <span className="text-xs text-muted-foreground">
            Range: {minTargetStoryWordCount}-{maxTargetStoryWordCount}
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
            min={minTargetChapterCount}
            max={maxTargetChapterCount}
            step={1}
            value={chapterCountInput}
            onChange={(event) => onChapterCountInputChange(event.target.value)}
            onBlur={() => onChapterCountCommit(chapterCountInput)}
            className="w-32"
          />
          <span className="text-xs text-muted-foreground">
            Range: {minTargetChapterCount}-{maxTargetChapterCount}
          </span>
        </div>
      </div>
    </>
  );
}
