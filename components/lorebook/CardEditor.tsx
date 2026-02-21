import React, { useState, useEffect, useRef } from 'react';
import { useLorebookStore } from '@/store/useLorebookStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import {
  extractLoreFromText,
  isLoreExtractionParseError,
  parseLoreCardsFromRawJsonWithLlmRepair,
} from '@/lib/lore-extractor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Trash2, Image as ImageIcon, Wand2 } from 'lucide-react';
import {
  GLOBAL_LOREBOOK_NOVEL_ID,
  LoreCard,
  LoreCharacterSourceMode,
  LoreExtractionTarget,
} from '@/lib/lorebook-types';

interface CardEditorProps {
  cardId: string | null;
  onClose: () => void;
  onSelectCard?: (id: string) => void;
}

export function CardEditor({ cardId, onClose, onSelectCard }: CardEditorProps) {
  const { cards, addCard, addCards, updateCard, deleteCard } = useLorebookStore();
  const { getResolvedGenerationConfig } = useSettingsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<LoreCard>>({
    type: 'character',
    name: '',
    coreData: { description: '', personality: '', scenario: '', first_mes: '', mes_example: '' }
  });

  const [extractText, setExtractText] = useState('');
  const [extractionTarget, setExtractionTarget] = useState<LoreExtractionTarget>('singleCharacter');
  const [characterSourceMode, setCharacterSourceMode] = useState<LoreCharacterSourceMode>('autoDetect');
  const [manualCharacterListText, setManualCharacterListText] = useState('');
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [rawExtractionOutput, setRawExtractionOutput] = useState('');
  const [editableRawOutput, setEditableRawOutput] = useState('');
  const [retryParseError, setRetryParseError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExtractDialogOpen, setIsExtractDialogOpen] = useState(false);

  useEffect(() => {
    if (cardId && cardId !== 'new') {
      const card = cards.find(c => c.id === cardId);
      if (card) {
        setFormData(card);
      }
    } else {
      setFormData({
        type: 'character',
        name: '',
        coreData: { description: '', personality: '', scenario: '', first_mes: '', mes_example: '' }
      });
    }
  }, [cardId, cards]);

  const handleSave = async () => {
    if (cardId === 'new') {
      const newId = await addCard({
        novelId: GLOBAL_LOREBOOK_NOVEL_ID,
        type: formData.type as 'character' | 'world',
        name: formData.name || 'Unnamed',
        avatarDataUri: formData.avatarDataUri,
        coreData: formData.coreData || { description: '', personality: '', scenario: '', first_mes: '', mes_example: '' }
      });
      // Don't close immediately, let them keep editing their new card, or close if you want.
      // Easiest is to close and let them select it from the list.
      onClose();
    } else if (cardId) {
      await updateCard(cardId, {
        type: formData.type as 'character' | 'world',
        name: formData.name,
        avatarDataUri: formData.avatarDataUri,
        coreData: formData.coreData
      });
      // Optionally show toast success here.
    }
  };

  const handleDelete = async () => {
    if (cardId && cardId !== 'new') {
      if (confirm('Are you sure you want to delete this card?')) {
        await deleteCard(cardId);
        onClose();
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatarDataUri: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const parseManualNames = () => (
    manualCharacterListText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  );

  const resolveRepairConfig = () => {
    const repair = getResolvedGenerationConfig('loreJsonRepair');
    if (repair.apiKey.trim()) {
      return repair;
    }
    // Fallback to loreExtractor config so Retry Parse still works out-of-the-box.
    return getResolvedGenerationConfig('loreExtractor');
  };

  const resetExtractionRecovery = () => {
    setExtractionError(null);
    setRawExtractionOutput('');
    setEditableRawOutput('');
    setRetryParseError(null);
  };

  const handleExtractDialogOpenChange = (open: boolean) => {
    setIsExtractDialogOpen(open);
    if (!open) {
      resetExtractionRecovery();
    }
  };

  const applyExtractedCards = async (outputCards: LoreCard[]) => {
    if (!outputCards || outputCards.length === 0) {
      alert("No clear lore data was extracted.");
      return;
    }

    if (extractionTarget === 'multipleCharacters') {
      const insertedIds = await addCards(
        outputCards.map((card) => ({
          novelId: GLOBAL_LOREBOOK_NOVEL_ID,
          type: card.type,
          name: card.name,
          avatarDataUri: card.avatarDataUri,
          coreData: card.coreData,
        }))
      );

      if (insertedIds.length > 0) {
        onSelectCard?.(insertedIds[0]);
      }

      setIsExtractDialogOpen(false);
      resetExtractionRecovery();
      return;
    }

    const first = outputCards[0];
    setFormData(prev => ({
      ...prev,
      type: first.type,
      name: first.name,
      coreData: {
        ...prev.coreData,
        ...first.coreData
      }
    }));
    setIsExtractDialogOpen(false);
    resetExtractionRecovery();
  };

  if (!cardId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg bg-card/10 p-8">
        Select a card to edit, or create a new one.
      </div>
    );
  }

  const handleExtract = async () => {
    if (!extractText.trim()) return;
    setIsExtracting(true);
    resetExtractionRecovery();
    try {
      const config = getResolvedGenerationConfig('loreExtractor');
      const repairConfig = resolveRepairConfig();
      const manualNames = parseManualNames();

      const outputCards = await extractLoreFromText(
        extractText,
        config.provider,
        config.model,
        config.apiKey,
        extractionTarget,
        {
          sourceMode: characterSourceMode,
          manualNames,
          params: config.params,
          supportedParameters: config.supportedParameters,
          maxContextTokens: config.maxContextTokens,
          maxCompletionTokens: config.maxCompletionTokens,
          repairConfig: {
            provider: repairConfig.provider,
            model: repairConfig.model,
            apiKey: repairConfig.apiKey,
            params: repairConfig.params,
            supportedParameters: repairConfig.supportedParameters,
            maxContextTokens: repairConfig.maxContextTokens,
            maxCompletionTokens: repairConfig.maxCompletionTokens,
          },
        }
      );
      await applyExtractedCards(outputCards);
    } catch (err: unknown) {
      if (isLoreExtractionParseError(err)) {
        setExtractionError(err.message);
        setRawExtractionOutput(err.rawOutput);
        setEditableRawOutput(err.rawOutput);
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown extraction error';
      alert(`Extraction failed: ${message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRetryParse = async () => {
    if (!editableRawOutput.trim()) {
      setRetryParseError('Please provide JSON output before retrying parse.');
      return;
    }

    setRetryParseError(null);
    try {
      const repairConfig = resolveRepairConfig();
      const outputCards = await parseLoreCardsFromRawJsonWithLlmRepair(editableRawOutput, extractionTarget, {
        sourceMode: characterSourceMode,
        manualNames: parseManualNames(),
        repairConfig: {
          provider: repairConfig.provider,
          model: repairConfig.model,
          apiKey: repairConfig.apiKey,
          params: repairConfig.params,
          supportedParameters: repairConfig.supportedParameters,
          maxContextTokens: repairConfig.maxContextTokens,
          maxCompletionTokens: repairConfig.maxCompletionTokens,
        },
      });
      await applyExtractedCards(outputCards);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown parse error';
      setRetryParseError(message);
    }
  };

  const handleExport = async () => {
    if (!formData.avatarDataUri) {
      alert("Please upload an avatar image (Square PNG) before exporting.");
      return;
    }
    try {
      // Dynamic import to avoid SSR issues if any, or just import at top.
      const { exportLorebookCardToPNG } = await import('@/lib/sillytavern-export');
      const blob = await exportLorebookCardToPNG(formData as LoreCard);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.name || 'card'}_export.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const cd = formData.coreData!;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
         <h3 className="text-lg font-bold">{cardId === 'new' ? 'New Entry' : 'Edit Entry'}</h3>
         <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
             Export PNG
           </Button>
           <Dialog open={isExtractDialogOpen} onOpenChange={handleExtractDialogOpenChange}>
             <DialogTrigger asChild>
               <Button variant="outline" size="sm" className="gap-2">
                 <Wand2 className="size-4" /> Extract from Text
               </Button>
             </DialogTrigger>
             <DialogContent>
               <DialogHeader>
                 <DialogTitle>AI Lore Extraction</DialogTitle>
               </DialogHeader>
               <div className="space-y-4">
                <Label>Paste background, story intro, or dialog snippet:</Label>
                <Textarea 
                  value={extractText} 
                   onChange={e => setExtractText(e.target.value)} 
                   className="h-40" 
                   placeholder="e.g. Elara is a thief with green eyes. She loves to say 'Hands off!'..."
                 />
                 <div className="space-y-2">
                   <Label>Extraction Target</Label>
                   <Select
                     value={extractionTarget}
                     onValueChange={(value) => setExtractionTarget(value as LoreExtractionTarget)}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select extraction target" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="singleCharacter">Single Character</SelectItem>
                       <SelectItem value="multipleCharacters">Multiple Characters</SelectItem>
                       <SelectItem value="worldLore">World / Lore</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                   <Label>Character Source</Label>
                   <Select
                     value={characterSourceMode}
                     onValueChange={(value) => setCharacterSourceMode(value as LoreCharacterSourceMode)}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select character source mode" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="autoDetect">Auto Detect</SelectItem>
                       <SelectItem value="manualList">Manual List</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 {characterSourceMode === 'manualList' && (
                   <div className="space-y-2">
                     <Label>Character List (one per line)</Label>
                     <Textarea
                       value={manualCharacterListText}
                       onChange={(e) => setManualCharacterListText(e.target.value)}
                       className="h-24"
                       placeholder={'Elara\nBran\nLina'}
                     />
                   </div>
                 )}
                 {extractionError && (
                   <div className="space-y-2 border rounded-md p-3 bg-card/40">
                     <p className="text-sm text-destructive">{extractionError}</p>
                     <Label>Raw LLM Output (Editable)</Label>
                     <Textarea
                       value={editableRawOutput}
                       onChange={(e) => setEditableRawOutput(e.target.value)}
                       className="h-36 font-mono text-xs"
                     />
                     {retryParseError && (
                       <p className="text-xs text-destructive">{retryParseError}</p>
                     )}
                     <div className="flex justify-end gap-2">
                       <Button variant="secondary" onClick={handleRetryParse}>
                         Retry Parse
                       </Button>
                     </div>
                     {rawExtractionOutput && (
                       <p className="text-xs text-muted-foreground">
                         Original output length: {rawExtractionOutput.length} chars
                       </p>
                     )}
                   </div>
                 )}
                 <div className="flex justify-end gap-2">
                   <Button variant="outline" onClick={() => handleExtractDialogOpenChange(false)}>Cancel</Button>
                   <Button onClick={handleExtract} disabled={isExtracting || !extractText.trim()}>
                     {isExtracting ? 'Extracting...' : 'Extract & Parse'}
                   </Button>
                 </div>
               </div>
             </DialogContent>
           </Dialog>

           {cardId !== 'new' && (
             <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
               <Trash2 className="size-4" /> Delete
             </Button>
           )}
           <Button variant="default" size="sm" onClick={handleSave} className="gap-2">
             <Save className="size-4" /> Save
           </Button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="character">Character</SelectItem>
                <SelectItem value="world">World / Lore</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
             <Label>Name</Label>
             <Input 
               value={formData.name || ''} 
               onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
               placeholder="Character or Entry Name"
             />
          </div>

          <div className="space-y-2">
             <Label>Avatar Image (Square PNG ideal for Exporters)</Label>
             <div className="flex items-center gap-4">
                <div 
                  className="size-20 bg-card/50 border rounded flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formData.avatarDataUri ? (
                    <img src={formData.avatarDataUri} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="size-8 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Upload Image
                  </Button>
                  {formData.avatarDataUri && (
                    <Button variant="ghost" size="sm" className="text-xs text-destructive h-auto p-0" onClick={() => setFormData(p => ({ ...p, avatarDataUri: undefined }))}>
                      Remove Selected
                    </Button>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
             </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Description (Appearance, Background)</Label>
            <Textarea 
              value={cd.description} 
              onChange={e => setFormData(p => ({ ...p, coreData: { ...p.coreData!, description: e.target.value }}))}
              className="h-24 resize-none"
              placeholder="Detailed description..."
            />
          </div>
          
          <div className="space-y-2">
            <Label>Personality</Label>
            <Input 
              value={cd.personality} 
              onChange={e => setFormData(p => ({ ...p, coreData: { ...p.coreData!, personality: e.target.value }}))}
              placeholder="Cold, calculating, etc."
            />
          </div>

          <div className="space-y-2">
            <Label>Scenario</Label>
            <Textarea 
              value={cd.scenario} 
              onChange={e => setFormData(p => ({ ...p, coreData: { ...p.coreData!, scenario: e.target.value }}))}
              className="h-20 resize-none"
            />
          </div>
           
          <div className="space-y-2">
            <Label>First Message</Label>
            <Textarea 
              value={cd.first_mes} 
              onChange={e => setFormData(p => ({ ...p, coreData: { ...p.coreData!, first_mes: e.target.value }}))}
              className="h-20 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Message Examples (Use {'<START>'}, {'{{user}}'}, {'{{char}}'})</Label>
            <Textarea 
              value={cd.mes_example} 
              onChange={e => setFormData(p => ({ ...p, coreData: { ...p.coreData!, mes_example: e.target.value }}))}
              className="h-32 font-mono text-xs"
              placeholder={'<START>\n{{user}}: Hello!\n{{char}}: Hi there.'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
