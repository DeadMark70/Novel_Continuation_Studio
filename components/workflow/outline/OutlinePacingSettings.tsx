'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OutlinePacingSettingsProps {
  pacingMode: 'fixed' | 'curve';
  plotPercentInput: string;
  curveStartInput: string;
  curveEndInput: string;
  sceneLimitInput: string;
  plotPercent: number;
  curvePlotPercentStart: number;
  curvePlotPercentEnd: number;
  onSetPacingMode: (mode: 'fixed' | 'curve') => void;
  onPlotPercentInputChange: (value: string) => void;
  onPlotPercentCommit: (value: string) => void;
  onCurveStartInputChange: (value: string) => void;
  onCurveStartCommit: (value: string) => void;
  onCurveEndInputChange: (value: string) => void;
  onCurveEndCommit: (value: string) => void;
  onSceneLimitInputChange: (value: string) => void;
  onSceneLimitCommit: (value: string) => void;
}

export function OutlinePacingSettings({
  pacingMode,
  plotPercentInput,
  curveStartInput,
  curveEndInput,
  sceneLimitInput,
  plotPercent,
  curvePlotPercentStart,
  curvePlotPercentEnd,
  onSetPacingMode,
  onPlotPercentInputChange,
  onPlotPercentCommit,
  onCurveStartInputChange,
  onCurveStartCommit,
  onCurveEndInputChange,
  onCurveEndCommit,
  onSceneLimitInputChange,
  onSceneLimitCommit,
}: OutlinePacingSettingsProps) {
  return (
    <div className="space-y-3 rounded-lg border border-cyan-500/20 bg-card/30 p-3">
      <Label className="text-xs font-mono text-cyan-500 font-bold">
        PACING RATIO MODE (PLOT VS EROTIC)
      </Label>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={pacingMode === 'fixed' ? 'default' : 'outline'}
          onClick={() => onSetPacingMode('fixed')}
        >
          Fixed
        </Button>
        <Button
          type="button"
          size="sm"
          variant={pacingMode === 'curve' ? 'default' : 'outline'}
          onClick={() => onSetPacingMode('curve')}
        >
          Curve (Warm Up)
        </Button>
      </div>

      {pacingMode === 'fixed' ? (
        <div className="space-y-2">
          <Label htmlFor="plot-percent" className="text-xs font-mono">Plot % (Erotic % = 100 - Plot %)</Label>
          <div className="flex items-center gap-3">
            <Input
              id="plot-percent"
              type="number"
              min={0}
              max={100}
              step={5}
              value={plotPercentInput}
              onChange={(event) => onPlotPercentInputChange(event.target.value)}
              onBlur={() => onPlotPercentCommit(plotPercentInput)}
              className="w-32"
            />
            <span className="text-xs text-muted-foreground">
              Current: {plotPercent}/{100 - plotPercent}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="curve-start" className="text-xs font-mono">Early Plot %</Label>
            <Input
              id="curve-start"
              type="number"
              min={0}
              max={100}
              step={5}
              value={curveStartInput}
              onChange={(event) => onCurveStartInputChange(event.target.value)}
              onBlur={() => onCurveStartCommit(curveStartInput)}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">Early ratio: {curvePlotPercentStart}/{100 - curvePlotPercentStart}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="curve-end" className="text-xs font-mono">Late Plot %</Label>
            <Input
              id="curve-end"
              type="number"
              min={0}
              max={100}
              step={5}
              value={curveEndInput}
              onChange={(event) => onCurveEndInputChange(event.target.value)}
              onBlur={() => onCurveEndCommit(curveEndInput)}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">Late ratio: {curvePlotPercentEnd}/{100 - curvePlotPercentEnd}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="erotic-scene-limit" className="text-xs font-mono">
          EROTIC SCENE LIMIT PER CHAPTER
        </Label>
        <div className="flex items-center gap-3">
          <Input
            id="erotic-scene-limit"
            type="number"
            min={0}
            max={8}
            step={1}
            value={sceneLimitInput}
            onChange={(event) => onSceneLimitInputChange(event.target.value)}
            onBlur={() => onSceneLimitCommit(sceneLimitInput)}
            className="w-24"
          />
          <span className="text-xs text-muted-foreground">
            0 means no explicit scene cap.
          </span>
        </div>
      </div>
    </div>
  );
}
