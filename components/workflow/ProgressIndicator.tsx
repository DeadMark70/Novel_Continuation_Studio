import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { StopCircle } from 'lucide-react';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  onStop: () => void;
  stopDisabled?: boolean;
}

export function ProgressIndicator({ current, total, onStop, stopDisabled = false }: ProgressIndicatorProps) {
  const pauseGeneration = useWorkflowStore((state) => state.pauseGeneration);
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));

  const handleStop = () => {
    pauseGeneration();
    onStop();
  };

  return (
    <div className="w-full space-y-4 p-4 bg-slate-900 rounded-lg border border-slate-700 animate-in fade-in">
      <div className="flex justify-between items-center text-slate-200">
        <span className="text-sm font-medium">
          正在生成... (第 {current}/{total} 章)
        </span>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={handleStop}
          disabled={stopDisabled}
          className="h-11 px-3 md:h-8"
        >
          <StopCircle className="mr-2 h-4 w-4" />
          暫停 / 停止
        </Button>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
