'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNovelStore } from '@/store/useNovelStore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReadingRoom } from '@/components/workflow/ReadingRoom';
import { VersionList } from '@/components/workflow/VersionList';
import { downloadAsTxt } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function HistoryPage() {
  const router = useRouter();
  const { sessions, currentSessionId, originalNovel, chapters, loadSessions, reset } = useNovelStore();
  const [selectedSessionId, setSelectedSessionId] = useState(currentSessionId);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    setSelectedSessionId(currentSessionId);
  }, [currentSessionId]);

  const selectedSession = sessions.find((session) => session.sessionId === selectedSessionId);
  const displayOriginal = selectedSession ? selectedSession.content : originalNovel;
  const displayChapters = selectedSession ? selectedSession.chapters : chapters;
  const displayWordCount = selectedSession ? selectedSession.wordCount : originalNovel.length;

  const handleExport = () => {
    downloadAsTxt('Novel_Project', displayOriginal, displayChapters);
  };

  const handleCreateNew = async () => {
    await reset();
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">History & Reading</h1>
            <p className="text-sm text-muted-foreground">Reading room, version history, and export</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/">Back to Studio</Link>
          </Button>
        </div>

        <Tabs defaultValue="reading" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reading">Reading Room</TabsTrigger>
            <TabsTrigger value="history">Version History</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="reading" className="h-[70vh]">
            <ReadingRoom />
          </TabsContent>

          <TabsContent value="history" className="h-[70vh]">
            <div className="rounded-lg border border-border p-3 h-full">
              <VersionList onCreateNew={handleCreateNew} />
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <div className="max-w-lg rounded-lg border border-border p-4 space-y-4">
              <div className="space-y-2">
                <Label>Select Session</Label>
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session.sessionId} value={session.sessionId}>
                        {session.sessionName} ({session.wordCount.toLocaleString()} chars)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground rounded-md border border-border p-3 space-y-1">
                <p>Original content: {displayWordCount.toLocaleString()} chars</p>
                <p>Generated chapters: {displayChapters.length}</p>
              </div>
              <Button onClick={handleExport}>Export TXT</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
