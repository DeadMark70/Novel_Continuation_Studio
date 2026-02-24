'use client';

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHarvestStore } from '@/store/useHarvestStore';
import { HarvestTemplateDialog } from '@/components/workflow/HarvestTemplateDialog';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/lib/utils';

export function HarvestTaskIndicator() {
  const {
    status,
    statusText,
    candidates,
    isSaving,
    showResultDialog,
    setShowResultDialog,
    setShowErrorDialog,
    saveSelectedCandidates,
    cancelHarvest,
    clearTask,
  } = useHarvestStore(
    useShallow((state) => ({
      status: state.status,
      statusText: state.statusText,
      candidates: state.candidates,
      isSaving: state.isSaving,
      showResultDialog: state.showResultDialog,
      setShowResultDialog: state.setShowResultDialog,
      setShowErrorDialog: state.setShowErrorDialog,
      saveSelectedCandidates: state.saveSelectedCandidates,
      cancelHarvest: state.cancelHarvest,
      clearTask: state.clearTask,
    }))
  );
  const isSensoryVaultOpen = useUiStore((state) => state.isSensoryVaultOpen);

  if (status === 'idle') {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'fixed bottom-4 z-40 w-[320px] rounded-lg border border-border bg-card/95 p-3 shadow-xl backdrop-blur transition-all',
          isSensoryVaultOpen ? 'right-[min(94vw,450px)]' : 'right-4'
        )}
      >
        <div className="flex items-center gap-2">
          {status === 'running' ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <div className={`size-2 rounded-full ${status === 'error' ? 'bg-destructive' : 'bg-emerald-500'}`} />
          )}
          <p className="text-xs font-mono">
            Sensory Harvest: {statusText || (status === 'running' ? '處理中...' : '已完成')}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {status === 'running' ? (
            <Button size="sm" variant="destructive" onClick={cancelHarvest}>
              Stop
            </Button>
          ) : null}
          {status === 'success' ? (
            <Button size="sm" variant="outline" onClick={() => setShowResultDialog(true)}>
              Review Candidates ({candidates.length})
            </Button>
          ) : null}
          {status === 'error' ? (
            <Button size="sm" variant="outline" onClick={() => setShowErrorDialog(true)}>
              View Error
            </Button>
          ) : null}
          {status !== 'running' ? (
            <Button size="sm" variant="ghost" onClick={clearTask}>
              Dismiss
            </Button>
          ) : null}
        </div>
      </div>

      <HarvestTemplateDialog
        open={showResultDialog}
        candidates={candidates}
        isSaving={isSaving}
        onOpenChange={setShowResultDialog}
        onConfirm={saveSelectedCandidates}
      />
    </>
  );
}
