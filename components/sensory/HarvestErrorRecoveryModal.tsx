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
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Sensory Harvest Error</DialogTitle>
          <DialogDescription>
            Auto-retry is disabled. Review the error and fix output JSON manually if needed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-mono text-destructive">
            {error || 'Unknown harvesting error.'}
          </p>
          <Textarea
            value={editableRaw}
            onChange={(event) => setEditableRaw(event.target.value)}
            className="min-h-[320px] font-mono text-xs"
            placeholder="Paste and fix harvest JSON output here..."
          />
        </div>
        <DialogFooter className="gap-2">
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
