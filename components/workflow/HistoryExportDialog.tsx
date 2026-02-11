'use client';

// Deprecated: history/export moved to /history page. Kept temporarily for compatibility tests.

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { History, BookOpen, Download, FileText } from 'lucide-react';
import { VersionList } from './VersionList';
import { ReadingRoom } from './ReadingRoom';
import { useNovelStore } from '@/store/useNovelStore';
import { downloadAsTxt } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export const HistoryExportDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { sessions, currentSessionId, originalNovel, chapters } = useNovelStore();
  const [selectedSessionId, setSelectedSessionId] = useState<string>(currentSessionId);

  // Sync with current session when dialog opens or current session changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedSessionId(currentSessionId);
    }
  }, [isOpen, currentSessionId]);

  const selectedSession = sessions.find((s) => s.sessionId === selectedSessionId);
  const displayOriginal = selectedSession ? selectedSession.content : originalNovel;
  const displayChapters = selectedSession ? selectedSession.chapters : chapters;
  const displayWordCount = selectedSession ? selectedSession.wordCount : (originalNovel.length);

  const handleExport = () => {
    downloadAsTxt('Novel_Project', displayOriginal, displayChapters);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <History className="size-4" />
          History & Export
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-7xl h-[70vh] flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="size-5" />
            Project Management
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="reading" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reading" className="gap-2">
              <BookOpen className="size-4" />
              Reading Room
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="size-4" />
              Version History
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <Download className="size-4" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reading" className="flex-1 min-h-0 py-4">
            <ReadingRoom />
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 py-4">
            <VersionList />
          </TabsContent>

          <TabsContent value="export" className="flex-1 min-h-0 py-4">
            <div className="flex items-center justify-center h-full">
              <Card className="max-w-md w-full bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="size-5 text-primary" />
                    Export Protocol
                  </CardTitle>
                  <CardDescription>
                    Download your project as a single formatted text file.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Select Session to Export</Label>
                    <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                      <SelectTrigger className="w-full font-mono text-sm">
                        <SelectValue placeholder="Select a session" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions.map((session, index) => (
                          <SelectItem key={`${session.sessionId}-${index}`} value={session.sessionId} className="font-mono text-xs">
                            {session.sessionName} ({session.wordCount.toLocaleString()} words)
                            {session.sessionId === currentSessionId && " [CURRENT]"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 text-xs font-mono space-y-2">
                    <p className="text-primary font-bold">INCLUDED IN EXPORT:</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      <li>Original Novel ({displayWordCount.toLocaleString()} chars)</li>
                      <li>All Generated Chapters ({displayChapters.length})</li>
                      <li>Export Timestamp</li>
                    </ul>
                  </div>
                  <Button className="w-full gap-2 font-mono uppercase tracking-widest" onClick={handleExport}>
                    <Download className="size-4" />
                    Download .txt
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
