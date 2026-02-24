'use client';

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { BookKey, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSettingsStore } from '@/store/useSettingsStore';

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
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [content, setContent] = React.useState('');
  const [tags, setTags] = React.useState('');
  const [povCharacter, setPovCharacter] = React.useState('通用');

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="fixed right-4 top-24 z-40 gap-2"
        onClick={() => setOpen((value) => !value)}
      >
        <BookKey className="size-4" />
        Sensory Vault
      </Button>

      {open ? (
        <aside className="fixed right-0 top-0 z-50 h-screen w-[360px] border-l border-border bg-background p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider">Sensory Vault</h2>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close sensory vault">
              <X className="size-4" />
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Template name"
            />
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Sensory anchor content..."
              className="min-h-[120px]"
            />
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

          <div className="mt-4 h-[calc(100vh-360px)] overflow-y-auto space-y-2 pr-1">
            {sensoryAnchorTemplates.map((template) => (
              <div key={template.id} className="rounded border border-border p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">{template.name}</p>
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
                <p className="mt-2 line-clamp-4 text-xs text-muted-foreground">{template.content}</p>
                {template.tags && template.tags.length > 0 ? (
                  <p className="mt-2 text-[11px] text-primary">{template.tags.join(' / ')}</p>
                ) : null}
              </div>
            ))}
          </div>
        </aside>
      ) : null}
    </>
  );
}
