'use client';

import React from 'react';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';

type ReadingSelection =
  | { kind: 'original' }
  | { kind: 'chapter'; index: number };

export const ReadingRoom: React.FC = () => {
  const { originalNovel, chapters } = useNovelStore(
    useShallow((state) => ({
      originalNovel: state.originalNovel,
      chapters: state.chapters,
    }))
  );
  const [selection, setSelection] = React.useState<ReadingSelection>({ kind: 'original' });

  React.useEffect(() => {
    if (selection.kind === 'chapter' && selection.index >= chapters.length) {
      setSelection({ kind: 'original' });
    }
  }, [chapters.length, selection]);

  const originalParagraphs = React.useMemo(() => {
    if (!originalNovel.trim()) {
      return [];
    }
    return originalNovel
      .split(/\n{2,}/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }, [originalNovel]);

  const readingTitle = selection.kind === 'original'
    ? 'Original Novel'
    : `Chapter ${selection.index + 1}`;
  const readingContent = selection.kind === 'original'
    ? originalNovel
    : (chapters[selection.index] || '');

  return (
    <div className="grid h-[70vh] grid-cols-1 overflow-hidden rounded-lg border border-border bg-card/20 lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-border bg-card/30 p-3 lg:border-b-0 lg:border-r">
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-primary">Reading Index</p>
        <div className="mt-3 space-y-2">
          <button
            type="button"
            className={cn(
              'w-full rounded border px-2 py-2 text-left text-xs',
              selection.kind === 'original'
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border bg-background/30 text-muted-foreground hover:bg-background/60'
            )}
            onClick={() => setSelection({ kind: 'original' })}
          >
            Original Novel
            <span className="ml-2 text-[10px] text-muted-foreground">
              {originalParagraphs.length} paragraphs
            </span>
          </button>
          <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1">
            {chapters.map((chapter, index) => (
              <button
                key={`reading-chapter-${index}`}
                type="button"
                className={cn(
                  'w-full rounded border px-2 py-2 text-left text-xs',
                  selection.kind === 'chapter' && selection.index === index
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border bg-background/30 text-muted-foreground hover:bg-background/60'
                )}
                onClick={() => setSelection({ kind: 'chapter', index })}
              >
                Chapter {index + 1}
                <span className="ml-2 text-[10px] text-muted-foreground">
                  {chapter.length} chars
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col">
        <div className="border-b border-border bg-card/40 px-4 py-3">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
            {readingTitle}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {readingContent.trim() ? (
            <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed">
              {readingContent}
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              {selection.kind === 'original'
                ? 'No original content uploaded.'
                : 'No chapter content available.'}
            </p>
          )}
        </div>
      </section>
    </div>
  );
};
