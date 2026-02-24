'use client';

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { FlaskConical, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNovelStore } from '@/store/useNovelStore';
import { useHarvestStore } from '@/store/useHarvestStore';
import { useUiStore } from '@/store/useUiStore';

export function SensoryHarvestPanel() {
  const originalNovel = useNovelStore((state) => state.originalNovel);
  const {
    status,
    statusText,
    candidates,
    startHarvest,
    setShowResultDialog,
    setShowErrorDialog,
    cancelHarvest,
  } = useHarvestStore(
    useShallow((state) => ({
      status: state.status,
      statusText: state.statusText,
      candidates: state.candidates,
      startHarvest: state.startHarvest,
      setShowResultDialog: state.setShowResultDialog,
      setShowErrorDialog: state.setShowErrorDialog,
      cancelHarvest: state.cancelHarvest,
    }))
  );
  const {
    isSensoryVaultOpen,
    toggleSensoryVault,
  } = useUiStore(
    useShallow((state) => ({
      isSensoryVaultOpen: state.isSensoryVaultOpen,
      toggleSensoryVault: state.toggleSensoryVault,
    }))
  );
  const isRunning = status === 'running';
  const canHarvest = originalNovel.trim().length > 0 && !isRunning;

  return (
    <Card className="border-border/80 bg-card/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="size-4 text-primary" />
          Sensory Harvest
        </CardTitle>
        <CardDescription>
          Extract sensory templates from your uploaded novel and manage them in Sensory Vault.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded border border-border/70 bg-background/40 px-3 py-2 text-xs font-mono">
          Status: {statusText || (isRunning ? '處理中...' : '待命')}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              void startHarvest(originalNovel);
            }}
            disabled={!canHarvest}
            className="gap-2"
          >
            {isRunning ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
            {isRunning ? 'Harvesting...' : 'Start Harvest'}
          </Button>
          {isRunning ? (
            <Button variant="destructive" onClick={cancelHarvest}>
              Stop
            </Button>
          ) : null}
          <Button variant="outline" onClick={toggleSensoryVault}>
            {isSensoryVaultOpen ? 'Close Vault' : 'Open Vault'}
          </Button>
          {status === 'success' ? (
            <Button variant="outline" onClick={() => setShowResultDialog(true)}>
              Review Candidates ({candidates.length})
            </Button>
          ) : null}
          {status === 'error' ? (
            <Button variant="outline" onClick={() => setShowErrorDialog(true)}>
              View Error
            </Button>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Phase Routing for sensory harvest model and params can be configured in Settings → Phase Center.
        </p>
      </CardContent>
    </Card>
  );
}
