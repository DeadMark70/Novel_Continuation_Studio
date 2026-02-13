'use client';

import React from 'react';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { Card, CardContent } from '@/components/ui/card';
import { Hash, Zap, Clock } from 'lucide-react';

export const NovelStats: React.FC = () => {
  const { wordCount } = useNovelStore(
    useShallow((state) => ({
      wordCount: state.wordCount,
    }))
  );

  const getEstimatedReadingTime = () => {
    // Approx 400-500 words/min for Chinese reading
    const mins = Math.ceil(wordCount / 500);
    return mins > 0 ? mins : 0;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Characters</p>
              <p className="text-3xl font-mono font-bold text-primary tabular-nums">
                {wordCount.toLocaleString()}
              </p>
            </div>
            <Hash className="size-8 text-primary/20" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Analysis Status</p>
              <p className="text-xl font-mono font-bold text-cyan-400">
                {wordCount > 0 ? 'READY' : 'WAITING'}
              </p>
            </div>
            <Zap className="size-8 text-cyan-400/20" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Est. Read Time</p>
              <p className="text-3xl font-mono font-bold text-amber-400 tabular-nums">
                {getEstimatedReadingTime()} <span className="text-sm font-sans font-normal text-muted-foreground">min</span>
              </p>
            </div>
            <Clock className="size-8 text-amber-400/20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
