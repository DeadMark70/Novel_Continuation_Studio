'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface OutlineOutputPanelsProps {
  hasStructuredOutline: boolean;
  part2A: string;
  part2B: string;
  rawContent: string;
  stepError?: string;
}

export function OutlineOutputPanels({
  hasStructuredOutline,
  part2A,
  part2B,
  rawContent,
  stepError,
}: OutlineOutputPanelsProps) {
  return (
    <>
      {hasStructuredOutline ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-mono text-cyan-300">Phase 2A Output</Label>
            <Textarea
              readOnly
              value={part2A}
              placeholder="Phase 2A output will appear here..."
              className="min-h-[220px] font-mono text-sm bg-card/50 resize-y focus-visible:ring-0"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-mono text-cyan-300">Phase 2B Output</Label>
            <Textarea
              readOnly
              value={part2B}
              placeholder="Phase 2B output will appear here..."
              className="min-h-[220px] font-mono text-sm bg-card/50 resize-y focus-visible:ring-0"
            />
          </div>
        </div>
      ) : (
        <Textarea
          readOnly
          value={rawContent}
          placeholder="Outline output will appear here..."
          className="min-h-[300px] font-mono text-sm bg-card/50 resize-y focus-visible:ring-0"
        />
      )}
      {stepError && (
        <p className="text-destructive text-xs mt-2 font-mono">ERROR: {stepError}</p>
      )}
    </>
  );
}
