'use client';

import React, { useRef } from 'react';
import { useNovelStore } from '@/store/useNovelStore';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Eraser } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const StoryUpload: React.FC = () => {
  const { originalNovel, setNovel, reset } = useNovelStore(
    useShallow((state) => ({
      originalNovel: state.originalNovel,
      setNovel: state.setNovel,
      reset: state.reset,
    }))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showInvalidFileDialog, setShowInvalidFileDialog] = React.useState(false);
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNovel(e.target.value);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      setShowInvalidFileDialog(true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setNovel(content);
    };
    reader.readAsText(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="w-full border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <FileText className="size-5" />
          Novel Input
        </CardTitle>
        <CardDescription>
          Paste your novel content or upload a .txt file to begin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full gap-1.5">
          <Label htmlFor="novel-content" className="text-muted-foreground">Original Text</Label>
          <Textarea
            id="novel-content"
            placeholder="Paste your story here..."
            className="min-h-[300px] resize-y font-sans leading-relaxed transition-all focus:border-primary/50"
            value={originalNovel}
            onChange={handleTextChange}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={triggerFileUpload}
            className="flex items-center gap-2 hover:border-primary/50"
          >
            <Upload className="size-4" />
            Upload TXT
          </Button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".txt" 
            className="hidden" 
          />

          <Button 
            variant="destructive" 
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2"
          >
            <Eraser className="size-4" />
            Clear
          </Button>
        </div>
      </CardContent>
      <Dialog open={showInvalidFileDialog} onOpenChange={setShowInvalidFileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invalid File Type</DialogTitle>
            <DialogDescription>
              Please upload a plain text file (`.txt`) to import novel content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowInvalidFileDialog(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear Current Content?</DialogTitle>
            <DialogDescription>
              This will clear the current novel text in the editor.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void reset();
                setShowClearConfirm(false);
              }}
            >
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
