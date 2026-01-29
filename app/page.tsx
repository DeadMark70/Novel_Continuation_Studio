'use client';

import React, { useEffect } from 'react';
import { useNovelStore } from '@/store/useNovelStore';
import { NovelStats } from '@/components/NovelStats';
import { StoryUpload } from '@/components/StoryUpload';
import { Separator } from '@/components/ui/separator';
import { Terminal, ShieldAlert } from 'lucide-react';

export default function Home() {
  const { initialize } = useNovelStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

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
          
          <div className="hidden md:flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <div className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
              NIM_API: ONLINE
            </div>
            <div className="text-muted-foreground">|</div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldAlert className="size-3" />
              LOCAL_STORAGE: SECURE
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-8 space-y-8">
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
            {/* Main Input area (taking most space) */}
            <div className="lg:col-span-3">
              <StoryUpload />
            </div>

            {/* Sidebar for additional info/controls */}
            <div className="lg:col-span-1 space-y-6">
              <div className="rounded-lg border border-border bg-card/20 p-4 space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase text-primary border-b border-primary/10 pb-2">System Instructions</h3>
                <ul className="text-xs space-y-3 text-muted-foreground font-sans list-disc list-inside">
                  <li>Upload or paste your Pixiv novel content to the central terminal.</li>
                  <li>System will automatically analyze characters, setting, and style.</li>
                  <li>Ensure the NIM_API key is configured in your environment.</li>
                  <li>Progress is automatically persisted to local secure storage.</li>
                </ul>
              </div>

              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <h3 className="text-xs font-mono font-bold uppercase text-destructive pb-2 flex items-center gap-2">
                  <ShieldAlert className="size-3" />
                  Security Notice
                </h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  All processing happens locally via NVIDIA NIM. Content is stored in your browser's IndexedDB and never touches our servers.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-border py-6 bg-card/10">
        <div className="container mx-auto px-4 flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          <p>© 2026 NCS INFRASTRUCTURE</p>
          <div className="flex gap-4">
            <span>Lat: --.----</span>
            <span>Lng: ---.----</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
