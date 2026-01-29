'use client';

import React, { useRef } from 'react';
import { useNovelStore } from '@/store/useNovelStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Eraser } from 'lucide-react';

export const StoryUpload: React.FC = () => {
  const { originalNovel, setNovel, reset } = useNovelStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNovel(e.target.value);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      alert('Please upload a .txt file.');
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
            onClick={() => {
              if (confirm('Are you sure you want to clear the content?')) {
                reset();
              }
            }}
            className="flex items-center gap-2"
          >
            <Eraser className="size-4" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
