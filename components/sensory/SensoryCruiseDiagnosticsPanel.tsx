'use client';

import React from 'react';
import type { SensoryCruiseResolution } from '@/lib/sensory-cruise';

interface SensoryCruiseDiagnosticsPanelProps {
  chapterNumber: number;
  autoSensoryMapping: boolean;
  resolution: SensoryCruiseResolution;
  breakdownMeta?: {
    repairReasons?: string[];
    injectedTagsByChapter?: Record<number, string[]>;
  };
}

function resolveSourceLabel(source: SensoryCruiseResolution['source']): string {
  if (source === 'manual') {
    return '手動覆寫';
  }
  if (source === 'autoMapping') {
    return '自動巡航（Breakdown 匹配）';
  }
  if (source === 'autoTemplate') {
    return 'Phase 預設模板';
  }
  return '未注入';
}

function resolveHint(
  resolution: SensoryCruiseResolution,
  autoSensoryMapping: boolean
): string {
  if (resolution.source === 'manual') {
    return '已使用手動錨點，會覆蓋自動巡航與 Phase 預設模板。';
  }
  if (resolution.source === 'autoMapping') {
    return '已依本章 Breakdown 的感官標籤與視角匹配模板。';
  }
  if (resolution.source === 'autoTemplate') {
    return autoSensoryMapping
      ? 'Auto Mapping 無匹配結果，已 fallback 到 Phase 預設模板。'
      : '自動巡航關閉，改用 Phase 預設模板。';
  }
  return autoSensoryMapping
    ? '本章尚未匹配到可用感官訊號，請檢查 Breakdown 是否包含推薦標籤與視角。'
    : '自動巡航關閉且未提供手動錨點，目前不會注入感官模板。';
}

export function SensoryCruiseDiagnosticsPanel({
  chapterNumber,
  autoSensoryMapping,
  resolution,
  breakdownMeta,
}: SensoryCruiseDiagnosticsPanelProps) {
  const preview = resolution.anchors?.trim() || '';
  const matchedTags = resolution.autoMappingResult?.matchedTags ?? [];
  const matchedPov = resolution.autoMappingResult?.matchedPov?.trim() || '';
  const injectedTagsForChapter = breakdownMeta?.injectedTagsByChapter?.[chapterNumber] ?? [];
  const usedSystemFallback = injectedTagsForChapter.length > 0;

  return (
    <div className="rounded border border-border/70 bg-card/20 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono font-semibold">巡航診斷（預覽）</p>
        <p className="text-[11px] text-muted-foreground">目標章節：第 {chapterNumber} 章</p>
      </div>

      <div className="mt-2 space-y-1">
        <p>
          來源：<span className="font-semibold">{resolveSourceLabel(resolution.source)}</span>
        </p>
        {resolution.selectedTemplateNames.length > 0 ? (
          <p>
            模板：<span className="font-semibold">{resolution.selectedTemplateNames.join('、')}</span>
          </p>
        ) : null}
        {resolution.source === 'autoMapping' ? (
          <p>
            匹配：標籤 {matchedTags.length > 0 ? matchedTags.join('、') : '無'} / 視角 {matchedPov || '通用'}
          </p>
        ) : null}
        {resolution.source === 'autoMapping' ? (
          <p>
            Breakdown 標籤來源：
            <span className={`font-semibold ${usedSystemFallback ? 'text-orange-300' : ''}`}>
              {usedSystemFallback ? '系統補全（Fallback）' : '模型原生'}
            </span>
          </p>
        ) : null}
        {usedSystemFallback ? (
          <p className="text-[11px] text-orange-200">
            補全標籤：{injectedTagsForChapter.join('、')}
            {breakdownMeta?.repairReasons?.length
              ? `（原因：${breakdownMeta.repairReasons.join(' / ')}）`
              : ''}
          </p>
        ) : null}
      </div>

      {preview ? (
        <div className="mt-2 rounded border border-border/60 bg-background/40 p-2">
          <p className="line-clamp-4 whitespace-pre-wrap text-[11px] text-muted-foreground">{preview}</p>
        </div>
      ) : null}

      <p className="mt-2 text-[11px] text-muted-foreground">
        {resolveHint(resolution, autoSensoryMapping)}
      </p>
    </div>
  );
}
