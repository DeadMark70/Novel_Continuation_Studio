'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { History, BookOpen, Download } from 'lucide-react';
import { VersionList } from './VersionList';

export const HistoryExportDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <History className="size-4" />
          History & Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col bg-card border-border">
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
            <div className="h-full flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
              Reading Room Content (Placeholder)
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 py-4">
            <VersionList />
          </TabsContent>

          <TabsContent value="export" className="flex-1 min-h-0 py-4">
            <div className="h-full flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
              Export Options (Placeholder)
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
