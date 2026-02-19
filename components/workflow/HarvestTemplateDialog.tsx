'use client';

import React from 'react';
import type { HarvestedTemplateCandidate } from '@/lib/llm-types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface HarvestTemplateDialogProps {
  open: boolean;
  candidates: HarvestedTemplateCandidate[];
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selected: HarvestedTemplateCandidate[]) => void | Promise<void>;
}

function parseTagInput(raw: string): string[] {
  return [...new Set(
    raw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  )].slice(0, 8);
}

export function HarvestTemplateDialog({
  open,
  candidates,
  isSaving = false,
  onOpenChange,
  onConfirm,
}: HarvestTemplateDialogProps) {
  const [editableCandidates, setEditableCandidates] = React.useState<HarvestedTemplateCandidate[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    setEditableCandidates(candidates);
    setSelectedIds(candidates.map((entry) => entry.id));
  }, [open, candidates]);

  const toggleSelected = React.useCallback((id: string) => {
    setSelectedIds((current) => (
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id]
    ));
  }, []);

  const selectedCount = selectedIds.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Harvest Sensory Templates</DialogTitle>
          <DialogDescription>
            Select the best candidates to save into your sensory template library.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {editableCandidates.map((candidate) => {
            const checked = selectedIds.includes(candidate.id);
            return (
              <div
                key={candidate.id}
                className={`rounded border p-3 ${checked ? 'border-primary/60 bg-primary/5' : 'border-border bg-card/20'}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-primary"
                    checked={checked}
                    onChange={() => toggleSelected(candidate.id)}
                    aria-label={`select-${candidate.id}`}
                  />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm leading-relaxed">{candidate.text}</p>
                    <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span>Sensory: {candidate.sensoryScore.toFixed(2)}</span>
                      <span>Control-loss: {candidate.controlLossScore.toFixed(2)}</span>
                    </div>
                    <Input
                      value={candidate.tags.join(', ')}
                      onChange={(event) => {
                        const tags = parseTagInput(event.target.value);
                        setEditableCandidates((current) => current.map((entry) => (
                          entry.id === candidate.id ? { ...entry, tags } : entry
                        )));
                      }}
                      placeholder="tags, comma-separated"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const selected = editableCandidates.filter((entry) => selectedIds.includes(entry.id));
              await onConfirm(selected);
            }}
            disabled={selectedCount === 0 || isSaving}
          >
            Add Selected ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
