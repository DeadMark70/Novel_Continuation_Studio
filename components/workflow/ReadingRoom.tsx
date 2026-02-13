'use client';

import React from 'react';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { Separator } from '@/components/ui/separator';

export const ReadingRoom: React.FC = () => {
  const { originalNovel, chapters } = useNovelStore(
    useShallow((state) => ({
      originalNovel: state.originalNovel,
      chapters: state.chapters,
    }))
  );

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* Left: Original Novel */}
      <div className="flex-1 flex flex-col min-w-0 border border-border rounded-lg bg-card/30 overflow-hidden">
        <div className="p-3 bg-card border-b border-border flex justify-between items-center">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">Original Novel</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-serif text-sm leading-relaxed whitespace-pre-wrap selection:bg-primary/20">
          {originalNovel || <p className="text-muted-foreground italic">No original content uploaded.</p>}
        </div>
      </div>

      <Separator orientation="vertical" className="h-full" />

      {/* Right: Generated Chapters */}
      <div className="flex-1 flex flex-col min-w-0 border border-border rounded-lg bg-card/30 overflow-hidden">
        <div className="p-3 bg-card border-b border-border flex justify-between items-center">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">Generated Chapters</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-serif text-sm leading-relaxed whitespace-pre-wrap selection:bg-primary/20 space-y-8">
          {chapters.length > 0 ? (
            chapters.map((chapter, index) => (
              <div key={index} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-primary/10" />
                  <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.3em]">Chapter {index + 1}</span>
                  <div className="h-px flex-1 bg-primary/10" />
                </div>
                <div>{chapter}</div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground italic">No chapters generated yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
