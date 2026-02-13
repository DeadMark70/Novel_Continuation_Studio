'use client';

import React from 'react';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { useRunSchedulerStore } from '@/store/useRunSchedulerStore';
import { Button } from '@/components/ui/button';
import { useStepGenerator } from '@/hooks/useStepGenerator';
import { Clock, FileText, Trash2, CheckCircle, Plus, StopCircle, RotateCcw, Loader2 } from 'lucide-react';
import type { RunStatus } from '@/lib/run-types';
import type { WorkflowStepId } from '@/store/useWorkflowStore';

interface VersionListProps {
  onCreateNew?: () => void | Promise<void>;
}

export const VersionList: React.FC<VersionListProps> = ({ onCreateNew }) => {
  const { sessions, currentSessionId, loadSession, deleteSessionById, startNewSession } = useNovelStore(
    useShallow((state) => ({
      sessions: state.sessions,
      currentSessionId: state.currentSessionId,
      loadSession: state.loadSession,
      deleteSessionById: state.deleteSessionById,
      startNewSession: state.startNewSession,
    }))
  );
  const sessionStates = useRunSchedulerStore((state) => state.sessionStates);
  const { generate, stopSession } = useStepGenerator();
  const handleCreateNew = () => {
    void Promise.resolve(onCreateNew ? onCreateNew() : startNewSession());
  };

  const getStatusLabel = (status: RunStatus, stepId?: string) => {
    if (status === 'running') return `Running ${stepId ?? ''}`.trim();
    if (status === 'queued') return `Queued ${stepId ?? ''}`.trim();
    if (status === 'error') return `Error ${stepId ?? ''}`.trim();
    if (status === 'interrupted') return `Interrupted ${stepId ?? ''}`.trim();
    return 'Idle';
  };

  const getStatusClass = (status: RunStatus) => {
    if (status === 'running') return 'bg-sky-600/20 text-sky-300 border-sky-400/40';
    if (status === 'queued') return 'bg-amber-500/20 text-amber-300 border-amber-400/40';
    if (status === 'error') return 'bg-red-500/20 text-red-300 border-red-400/40';
    if (status === 'interrupted') return 'bg-zinc-700/30 text-zinc-300 border-zinc-500/40';
    return 'bg-zinc-800/20 text-zinc-400 border-zinc-600/30';
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今天 ' + date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return `${diffDays} 天前`;
    } else {
      return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <FileText className="size-8 mb-2 opacity-20" />
        <p className="text-sm">尚無任何創作記錄</p>
        <p className="text-xs mt-1">開始新的分析後，會自動保存到這裡</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-4 gap-2"
          onClick={handleCreateNew}
        >
          <Plus className="size-4" />
          新建創作
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* New Session Button */}
      <Button 
        variant="outline" 
        size="sm" 
        className="mb-3 gap-2 shrink-0"
        onClick={handleCreateNew}
      >
        <Plus className="size-4" />
        新建創作
      </Button>
      
      {/* Session List */}
      <div className="space-y-1 overflow-y-auto pr-2 flex-1">
      {sessions.map((session, index) => {
        const isActive = session.sessionId === currentSessionId;
        const runtime = sessionStates[session.sessionId];
        const status = runtime?.status ?? session.runStatus ?? 'idle';
        const stepId = runtime?.activeStepId ?? session.recoverableStepId;
        const canResume = (status === 'interrupted' || status === 'error') && Boolean(stepId);
        
        return (
          <div
            key={session.sessionId || `session-${index}`}
            className={`
              group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
              ${isActive 
                ? 'bg-primary/10 border border-primary/30' 
                : 'hover:bg-card/80 border border-transparent hover:border-border'
              }
            `}
            onClick={() => !isActive && loadSession(session.sessionId)}
          >
            {/* Icon */}
            <div className={`
              shrink-0 size-8 rounded-full flex items-center justify-center
              ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}
            `}>
              {isActive ? <CheckCircle className="size-4" /> : <FileText className="size-4" />}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : ''}`}>
                {session.sessionName || '未命名小說'}
              </p>
              <div className="mt-1">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-mono ${getStatusClass(status)}`}>
                  {status === 'running' ? <Loader2 className="size-3 mr-1 animate-spin" /> : null}
                  {getStatusLabel(status, stepId)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDate(session.updatedAt)}
                </span>
                <span>•</span>
                <span>{session.chapters?.length || 0} 章</span>
                <span>•</span>
                <span>{session.wordCount?.toLocaleString() || 0} 字</span>
              </div>
            </div>

            {status === 'running' || status === 'queued' ? (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  stopSession(session.sessionId);
                }}
              >
                <StopCircle className="size-3.5" />
                Stop
              </Button>
            ) : null}

            {canResume ? (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  generate(stepId as WorkflowStepId, undefined, session.sessionId);
                }}
              >
                <RotateCcw className="size-3.5" />
                Resume
              </Button>
            ) : null}
            
            {/* Delete button */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 size-11 opacity-0 transition-opacity hover:bg-destructive/20 hover:text-destructive md:size-7 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('確定要刪除這個創作記錄嗎？此操作無法撤銷。')) {
                  deleteSessionById(session.sessionId);
                }
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        );
      })}
      </div>
    </div>
  );
};
