import React from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AutoModeControlProps {
  onStart: () => void;
}

export function AutoModeControl({ onStart }: AutoModeControlProps) {
  const { 
    autoMode, 
    setAutoMode, 
    autoRangeStart, 
    autoRangeEnd, 
    setAutoRange
  } = useWorkflowStore();

  return (
    <Card className="w-full bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium text-slate-200">生成模式控制</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selection - Custom Radio Group */}
        <div className="grid gap-4">
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="mode-manual"
              name="autoMode"
              value="manual"
              checked={autoMode === 'manual'}
              onChange={() => setAutoMode('manual')}
              data-testid="mode-manual"
              className="w-4 h-4 text-primary bg-slate-800 border-slate-600 focus:ring-primary focus:ring-offset-slate-900"
            />
            <Label htmlFor="mode-manual" className="text-slate-200 cursor-pointer">
              手動模式 (每章確認)
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="mode-full_auto"
              name="autoMode"
              value="full_auto"
              checked={autoMode === 'full_auto'}
              onChange={() => setAutoMode('full_auto')}
              data-testid="mode-full_auto"
              className="w-4 h-4 text-primary bg-slate-800 border-slate-600 focus:ring-primary focus:ring-offset-slate-900"
            />
            <Label htmlFor="mode-full_auto" className="text-slate-200 cursor-pointer">
              全自動模式 (自動完成第 2-5 章)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="mode-range"
              name="autoMode"
              value="range"
              checked={autoMode === 'range'}
              onChange={() => setAutoMode('range')}
              data-testid="mode-range"
              className="w-4 h-4 text-primary bg-slate-800 border-slate-600 focus:ring-primary focus:ring-offset-slate-900"
            />
            <Label htmlFor="mode-range" className="text-slate-200 cursor-pointer">
              範圍模式
            </Label>
          </div>
        </div>

        {/* Range Selector */}
        {autoMode === 'range' && (
          <div className="flex items-center gap-4 pl-6 animate-in fade-in slide-in-from-top-2" data-testid="range-selector">
            <div className="grid gap-2">
              <Label className="text-xs text-slate-400">起始章節</Label>
              <Select 
                value={autoRangeStart.toString()} 
                onValueChange={(v) => setAutoRange(parseInt(v), autoRangeEnd)}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5].map(num => (
                    <SelectItem key={num} value={num.toString()}>第 {num} 章</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-slate-400 mt-6">至</span>
            <div className="grid gap-2">
              <Label className="text-xs text-slate-400">結束章節</Label>
              <Select 
                value={autoRangeEnd.toString()} 
                onValueChange={(v) => setAutoRange(autoRangeStart, parseInt(v))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5].map(num => (
                    <SelectItem key={num} value={num.toString()} disabled={num < autoRangeStart}>
                      第 {num} 章
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Start Button */}
        <Button 
          onClick={onStart}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          🚀 開始生成
        </Button>
      </CardContent>
    </Card>
  );
}
