'use client';

import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Hand, Zap, SlidersHorizontal } from 'lucide-react';

interface AutoModeControlProps {
  onStart: () => void;
}

export function AutoModeControl({ onStart }: AutoModeControlProps) {
  const { 
    autoMode, 
    setAutoMode, 
    autoRangeStart, 
    autoRangeEnd, 
    setAutoRange,
    setMaxAutoChapter
  } = useWorkflowStore(
    useShallow((state) => ({
      autoMode: state.autoMode,
      setAutoMode: state.setAutoMode,
      autoRangeStart: state.autoRangeStart,
      autoRangeEnd: state.autoRangeEnd,
      setAutoRange: state.setAutoRange,
      setMaxAutoChapter: state.setMaxAutoChapter,
    }))
  );
  const { targetChapterCount } = useNovelStore(
    useShallow((state) => ({
      targetChapterCount: state.targetChapterCount,
    }))
  );

  const maxChapter = Math.max(2, targetChapterCount ?? 5);
  const chapterOptions = Array.from({ length: Math.max(1, maxChapter - 1) }, (_, index) => index + 2);

  React.useEffect(() => {
    setMaxAutoChapter(maxChapter);
  }, [maxChapter, setMaxAutoChapter]);

  React.useEffect(() => {
    const clampedStart = Math.max(2, Math.min(autoRangeStart, maxChapter));
    const clampedEnd = Math.max(clampedStart, Math.min(autoRangeEnd, maxChapter));
    if (clampedStart !== autoRangeStart || clampedEnd !== autoRangeEnd) {
      setAutoRange(clampedStart, clampedEnd);
    }
  }, [autoRangeStart, autoRangeEnd, maxChapter, setAutoRange]);

  const modes = [
    { 
      id: 'manual' as const, 
      label: '手動模式', 
      description: '每完成一章後等待確認',
      icon: Hand
    },
    { 
      id: 'full_auto' as const, 
      label: '全自動模式', 
      description: `自動完成第 2-${maxChapter} 章`,
      icon: Zap
    },
    { 
      id: 'range' as const, 
      label: '範圍模式', 
      description: '自定義自動生成範圍',
      icon: SlidersHorizontal
    },
  ];

  return (
    <div className="space-y-4 p-4 bg-card/30 rounded-lg border border-border/50">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-muted-foreground">
        <SlidersHorizontal className="size-4" />
        生成模式控制
      </div>

      {/* Mode Selection */}
      <div className="grid gap-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = autoMode === mode.id;
          
          return (
            <button
              key={mode.id}
              data-testid={`mode-${mode.id}`}
              onClick={() => setAutoMode(mode.id)}
              className={`
                flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                ${isSelected 
                  ? 'bg-primary/10 border-primary/50 text-primary' 
                  : 'bg-card/50 border-border/50 text-muted-foreground hover:bg-card hover:border-border'
                }
              `}
            >
              <div className={`
                shrink-0 size-8 rounded-full flex items-center justify-center
                ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}
              `}>
                <Icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isSelected ? 'text-foreground' : ''}`}>
                  {mode.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {mode.description}
                </p>
              </div>
              <div className={`
                shrink-0 size-4 rounded-full border-2 transition-all
                ${isSelected 
                  ? 'border-primary bg-primary' 
                  : 'border-muted-foreground/30'
                }
              `}>
                {isSelected && (
                  <div className="size-full rounded-full bg-primary-foreground scale-50" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Range Selector */}
      {autoMode === 'range' && (
        <div 
          className="flex items-center gap-3 ml-11 p-3 bg-card/50 rounded-lg border border-border/50 animate-in fade-in slide-in-from-top-2"
          data-testid="range-selector"
        >
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">從第</Label>
            <Select 
              value={autoRangeStart.toString()} 
              onValueChange={(v) => setAutoRange(parseInt(v), autoRangeEnd)}
            >
              <SelectTrigger className="h-11 w-[80px] text-xs md:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chapterOptions.map(num => (
                  <SelectItem key={num} value={num.toString()}>{num} 章</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <span className="text-muted-foreground text-xs">至</span>
          
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">第</Label>
            <Select 
              value={autoRangeEnd.toString()} 
              onValueChange={(v) => setAutoRange(autoRangeStart, parseInt(v))}
            >
              <SelectTrigger className="h-11 w-[80px] text-xs md:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chapterOptions.map(num => (
                  <SelectItem key={num} value={num.toString()} disabled={num < autoRangeStart}>
                    {num} 章
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">自動</span>
          </div>
        </div>
      )}

      {/* Start Button */}
      <Button 
        onClick={onStart}
        className="w-full gap-2 font-mono uppercase tracking-wider"
      >
        <Play className="size-4" />
        開始生成
      </Button>
    </div>
  );
}
