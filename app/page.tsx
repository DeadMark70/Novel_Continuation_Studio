'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '@/store/useSettingsStore';
import { NovelStats } from '@/components/NovelStats';
import { StoryUpload } from '@/components/StoryUpload';
import { WorkflowStepper } from '@/components/WorkflowStepper';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Terminal, ShieldAlert, History, Settings, Plus } from 'lucide-react';

export default function Home() {
  const { initializeNovel, resetNovel } = useNovelStore(
    useShallow((state) => ({
      initializeNovel: state.initialize,
      resetNovel: state.reset,
    }))
  );
  const { initializeSettings, activeProvider } = useSettingsStore(
    useShallow((state) => ({
      initializeSettings: state.initialize,
      activeProvider: state.activeProvider,
    }))
  );

  useEffect(() => {
    initializeNovel();
    initializeSettings();
  }, [initializeNovel, initializeSettings]);

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground">
      {/* Header / Top Bar */}
      <header className="border-b border-border bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-primary/10 border border-primary/20">
              <Terminal className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight uppercase">Novel Continuation <span className="text-primary">Studio</span></h1>
              <p className="text-[10px] text-muted-foreground font-mono leading-none tracking-widest">SYSTEM VERSION 0.1.0_BETA</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <div className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {activeProvider.toUpperCase()}_API: READY
              </div>
              <div className="text-muted-foreground">|</div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ShieldAlert className="size-3" />
                LOCAL_STORAGE: SECURE
              </div>
            </div>
            <Separator orientation="vertical" className="h-6 hidden md:block" />
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                className="gap-2"
                onClick={() => {
                  void resetNovel();
                }}
              >
                <Plus className="size-4" />
                新建創作
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link href="/history">
                  <History className="size-4" />
                  History
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon">
                <Link href="/settings" aria-label="Open settings">
                  <Settings className="size-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Status Dashboard Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-[0.2em]">Dashboard</h2>
            <Separator className="flex-1" />
          </div>
          <NovelStats />
        </section>

        {/* Input & Control Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-[0.2em]">Input Protocol</h2>
            <Separator className="flex-1" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <StoryUpload />
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="rounded-lg border border-border bg-card/20 p-4 space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase text-primary border-b border-primary/10 pb-2">System Instructions</h3>
                <ul className="text-xs space-y-3 text-muted-foreground font-sans list-disc list-inside">
                  <li>Upload your novel to the terminal.</li>
                  <li>Follow the 6-step automated workflow below (Phase 0 is optional via settings).</li>
                  <li>Modify prompts in settings for deep customization.</li>
                  <li>Use &quot;Plot Direction&quot; in Step 2 to guide the story.</li>
                </ul>
              </div>

              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <h3 className="text-xs font-mono font-bold uppercase text-destructive pb-2 flex items-center gap-2">
                  <ShieldAlert className="size-3" />
                  Security Notice
                </h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Generation routes through your configured provider (NIM/OpenRouter). Content is stored locally in IndexedDB.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Automated Workflow Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-[0.2em]">Workflow Execution</h2>
            <Separator className="flex-1" />
          </div>
          <WorkflowStepper />
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-border py-6 bg-card/10">
        <div className="container mx-auto px-4 flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          <p>© 2026 NCS INFRASTRUCTURE</p>
          <div className="flex gap-4">
            <span>READY</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
