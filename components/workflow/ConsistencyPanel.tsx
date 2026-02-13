'use client';

import React, { useMemo, useState } from 'react';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Clock, FileText, Hash } from 'lucide-react';

function formatTime(timestamp?: number): string {
  if (!timestamp) {
    return '-';
  }
  return new Date(timestamp).toLocaleString();
}

function severityClass(severity: 'low' | 'medium' | 'high'): string {
  if (severity === 'high') {
    return 'text-destructive border-destructive/40 bg-destructive/10';
  }
  if (severity === 'medium') {
    return 'text-amber-500 border-amber-500/40 bg-amber-500/10';
  }
  return 'text-muted-foreground border-border bg-muted/30';
}

export const ConsistencyPanel: React.FC = () => {
  const {
    consistencyReports,
    characterTimeline,
    foreshadowLedger,
    latestConsistencySummary,
  } = useNovelStore(
    useShallow((state) => ({
      consistencyReports: state.consistencyReports,
      characterTimeline: state.characterTimeline,
      foreshadowLedger: state.foreshadowLedger,
      latestConsistencySummary: state.latestConsistencySummary,
    }))
  );

  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>('idle');

  const latestReport = consistencyReports.length > 0
    ? consistencyReports[consistencyReports.length - 1]
    : undefined;

  const openForeshadow = useMemo(
    () => foreshadowLedger.filter((entry) => entry.status === 'open').slice(-8).reverse(),
    [foreshadowLedger]
  );

  const recentTimeline = useMemo(
    () => characterTimeline.slice(-8).reverse(),
    [characterTimeline]
  );

  const handleCopy = async () => {
    if (!latestReport?.regenPromptDraft) {
      return;
    }

    if (!navigator?.clipboard?.writeText) {
      setCopyState('failed');
      return;
    }

    try {
      await navigator.clipboard.writeText(latestReport.regenPromptDraft);
      setCopyState('done');
      setTimeout(() => setCopyState('idle'), 1200);
    } catch {
      setCopyState('failed');
      setTimeout(() => setCopyState('idle'), 1200);
    }
  };

  return (
    <Card className="h-fit border border-border/80 bg-card/40" data-testid="consistency-panel">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold uppercase tracking-wider">Consistency Monitor</CardTitle>
        <CardDescription className="text-xs">
          章節完成後自動執行一致性檢查，追蹤角色狀態與伏筆回收。
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-border/60 bg-card/40 p-2">
            <p className="text-muted-foreground">Latest Chapter</p>
            <p className="font-mono font-bold">{latestConsistencySummary?.latestChapter ?? '-'}</p>
          </div>
          <div className="rounded border border-border/60 bg-card/40 p-2">
            <p className="text-muted-foreground">High Risk</p>
            <p className="font-mono font-bold">{latestConsistencySummary?.highRiskCount ?? 0}</p>
          </div>
          <div className="rounded border border-border/60 bg-card/40 p-2">
            <p className="text-muted-foreground">Open Foreshadow</p>
            <p className="font-mono font-bold">{latestConsistencySummary?.openForeshadowCount ?? 0}</p>
          </div>
          <div className="rounded border border-border/60 bg-card/40 p-2">
            <p className="text-muted-foreground">Checked At</p>
            <p className="font-mono text-[11px]">{formatTime(latestConsistencySummary?.lastCheckedAt)}</p>
          </div>
        </div>

        {!latestReport ? (
          <div className="rounded border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
            尚無一致性報告。生成第 1 章或續寫章節後，系統會自動檢查。
          </div>
        ) : (
          <>
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <AlertCircle className="size-3.5" />
                Latest Issues
              </div>
              {latestReport.issues.length === 0 ? (
                <p className="rounded border border-border/70 p-2 text-xs text-muted-foreground">未發現明確衝突。</p>
              ) : (
                <div className="space-y-2">
                  {latestReport.issues.slice(0, 6).map((issue) => (
                    <div key={issue.id} className="rounded border border-border/70 p-2 text-xs">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${severityClass(issue.severity)}`}>
                          {issue.severity}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">{issue.category}</span>
                      </div>
                      <p className="font-semibold">{issue.title}</p>
                      <p className="mt-1 text-muted-foreground">{issue.suggestion}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="size-3.5" />
                Character Timeline
              </div>
              {recentTimeline.length === 0 ? (
                <p className="rounded border border-border/70 p-2 text-xs text-muted-foreground">暫無角色狀態更新。</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {recentTimeline.map((entry) => (
                    <div key={entry.id} className="rounded border border-border/70 p-2">
                      <p className="font-semibold">{entry.character}</p>
                      <p className="text-muted-foreground">{entry.change}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">chapter {entry.chapterNumber}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Hash className="size-3.5" />
                Open Foreshadow
              </div>
              {openForeshadow.length === 0 ? (
                <p className="rounded border border-border/70 p-2 text-xs text-muted-foreground">目前沒有未回收伏筆。</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {openForeshadow.map((entry) => (
                    <div key={entry.id} className="rounded border border-border/70 p-2">
                      <p className="font-semibold">{entry.title}</p>
                      <p className="text-[10px] text-muted-foreground">updated at chapter {entry.lastUpdatedChapter}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileText className="size-3.5" />
                  Regeneration Draft
                </div>
                <Button type="button" size="sm" variant="outline" className="h-11 text-[11px] md:h-7" onClick={handleCopy}>
                  {copyState === 'done' ? 'Copied' : copyState === 'failed' ? 'Copy Failed' : 'Copy'}
                </Button>
              </div>
              <Textarea
                readOnly
                value={latestReport.regenPromptDraft}
                className="min-h-[140px] text-xs font-mono"
              />
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
};
