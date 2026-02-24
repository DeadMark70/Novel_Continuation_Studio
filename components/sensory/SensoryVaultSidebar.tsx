'use client';

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { BookKey, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUiStore } from '@/store/useUiStore';

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function createTemplateId(): string {
  return `sensory_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function SensoryVaultSidebar() {
  const {
    sensoryAnchorTemplates,
    setSensoryAnchorTemplates,
  } = useSettingsStore(
    useShallow((state) => ({
      sensoryAnchorTemplates: state.sensoryAnchorTemplates,
      setSensoryAnchorTemplates: state.setSensoryAnchorTemplates,
    }))
  );
  const {
    isSensoryVaultOpen,
    openSensoryVault,
    closeSensoryVault,
    toggleSensoryVault,
  } = useUiStore(
    useShallow((state) => ({
      isSensoryVaultOpen: state.isSensoryVaultOpen,
      openSensoryVault: state.openSensoryVault,
      closeSensoryVault: state.closeSensoryVault,
      toggleSensoryVault: state.toggleSensoryVault,
    }))
  );
  const [name, setName] = React.useState('');
  const [content, setContent] = React.useState('');
  const [tags, setTags] = React.useState('');
  const [povCharacter, setPovCharacter] = React.useState('通用');

  return (
    <>
      <Button
        type="button"
        variant={isSensoryVaultOpen ? 'default' : 'outline'}
        className="fixed bottom-4 left-4 z-30 gap-2"
        onClick={toggleSensoryVault}
      >
        <BookKey className="size-4" />
        Sensory Vault
      </Button>

      <Dialog open={isSensoryVaultOpen} onOpenChange={(open) => (open ? openSensoryVault() : closeSensoryVault())}>
        <DialogContent
          showCloseButton={false}
          className="!left-auto !right-0 !top-0 !h-screen !max-w-[430px] !w-[92vw] !translate-x-0 !translate-y-0 rounded-none border-l border-border/80 p-0"
        >
          <div className="flex h-full flex-col">
            <DialogHeader className="border-b border-border/70 px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <DialogTitle className="text-sm font-bold uppercase tracking-wide">Sensory Vault</DialogTitle>
                  <DialogDescription className="mt-1 text-xs">
                    Core sensory template library for harvest, chapter1 and continuation routing.
                  </DialogDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={closeSensoryVault} aria-label="Close sensory vault">
                  <X className="size-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="border-b border-border/70 bg-card/30 px-4 py-3">
              <div className="space-y-2">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Template name"
                />
                <Textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Sensory anchor content..."
                  className="min-h-[100px]"
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="tags, comma-separated"
                  />
                  <Input
                    value={povCharacter}
                    onChange={(event) => setPovCharacter(event.target.value)}
                    placeholder="POV character"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full gap-2"
                  onClick={() => {
                    const trimmedName = name.trim();
                    const trimmedContent = content.trim();
                    if (!trimmedName || !trimmedContent) {
                      return;
                    }
                    const next = [
                      ...sensoryAnchorTemplates,
                      {
                        id: createTemplateId(),
                        name: trimmedName,
                        content: trimmedContent,
                        tags: parseTags(tags),
                        povCharacter: povCharacter.trim() || '通用',
                      },
                    ];
                    void setSensoryAnchorTemplates(next);
                    setName('');
                    setContent('');
                    setTags('');
                    setPovCharacter('通用');
                  }}
                >
                  <Plus className="size-4" />
                  Add Template
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <div className="space-y-2">
                {sensoryAnchorTemplates.map((template) => (
                  <div key={template.id} className="rounded-md border border-border/70 bg-card/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-wide">{template.name}</p>
                        <p className="text-[11px] text-muted-foreground">{template.povCharacter || '通用'}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const next = sensoryAnchorTemplates.filter((entry) => entry.id !== template.id);
                          if (next.length === 0) {
                            return;
                          }
                          void setSensoryAnchorTemplates(next);
                        }}
                        aria-label={`Delete ${template.name}`}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                    <p className="mt-2 line-clamp-5 text-xs text-muted-foreground">{template.content}</p>
                    {template.tags && template.tags.length > 0 ? (
                      <p className="mt-2 text-[11px] text-primary">{template.tags.join(' / ')}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
