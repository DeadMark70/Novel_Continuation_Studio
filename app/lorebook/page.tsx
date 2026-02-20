'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CardList } from '@/components/lorebook/CardList';
import { CardEditor } from '@/components/lorebook/CardEditor';

export default function LorebookPage() {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="shrink-0">
              <Link href="/">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 text-primary">
              <div className="p-1.5 rounded bg-primary/10 border border-primary/20">
                <Library className="size-5" />
              </div>
              <h1 className="text-lg font-bold tracking-tight uppercase">Dynamic Lorebook Studio</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-[0.2em]">Character & World Cards</h2>
            <Separator className="flex-1" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            <div className="xl:col-span-1 border rounded bg-card/10 p-4">
               <CardList onSelectCard={setSelectedCardId} />
            </div>
            <div className="xl:col-span-2 border rounded bg-card/10 p-6 min-h-[600px] shadow-sm">
               <CardEditor cardId={selectedCardId} onClose={() => setSelectedCardId(null)} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
