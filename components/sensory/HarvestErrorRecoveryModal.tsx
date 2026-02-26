'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useHarvestStore } from '@/store/useHarvestStore';

export function HarvestErrorRecoveryModal() {
  const router = useRouter();
  const {
    showErrorDialog,
    error,
    rawOutput,
    setShowErrorDialog,
    applyManualJsonAndParse,
  } = useHarvestStore(
    useShallow((state) => ({
      showErrorDialog: state.showErrorDialog,
      error: state.error,
      rawOutput: state.rawOutput,
      setShowErrorDialog: state.setShowErrorDialog,
      applyManualJsonAndParse: state.applyManualJsonAndParse,
    }))
  );
  const [editableRaw, setEditableRaw] = React.useState('');

  React.useEffect(() => {
    if (showErrorDialog) {
      setEditableRaw(rawOutput);
    }
  }, [showErrorDialog, rawOutput]);

  return (
    <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Sensory Harvest Error</DialogTitle>
          <DialogDescription>
            Auto-retry is disabled. Review the error and fix output JSON manually if needed.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
          <p className="max-h-28 overflow-y-auto break-words rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-mono text-destructive">
            {error || 'Unknown harvesting error.'}
          </p>
          <Textarea
            value={editableRaw}
            onChange={(event) => setEditableRaw(event.target.value)}
            className="min-h-[280px] max-h-[50vh] font-mono text-xs"
            placeholder="Paste and fix harvest JSON output here..."
          />
        </div>
        <DialogFooter className="sticky bottom-0 gap-2 border-t border-border bg-background px-6 py-4">
          <Button variant="outline" onClick={() => router.push('/settings')}>
            Go To Settings
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              applyManualJsonAndParse(editableRaw);
            }}
          >
            Parse Corrected JSON
          </Button>
          <Button onClick={() => setShowErrorDialog(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
