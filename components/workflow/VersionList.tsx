'use client';

import React from 'react';
import { useNovelStore } from '@/store/useNovelStore';
import { Button } from '@/components/ui/button';
import { RotateCcw, Clock, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const VersionList: React.FC = () => {
  const { history, rollbackToVersion } = useNovelStore();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Clock className="size-8 mb-2 opacity-20" />
        <p className="text-sm">No version history found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-y-auto pr-2 h-full">
      {history.map((version, index) => (
        <Card key={version.id || index} className="bg-card/50 border-border hover:border-primary/50 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary font-mono">
                  Version {history.length - index}
                </span>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono uppercase tracking-tighter">
                  Step {version.currentStep}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDate(version.updatedAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="size-3" />
                  {version.wordCount.toLocaleString()} words
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8 text-xs font-mono uppercase tracking-wider hover:bg-primary hover:text-primary-foreground"
              onClick={() => rollbackToVersion(version)}
            >
              <RotateCcw className="size-3" />
              Rollback
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
