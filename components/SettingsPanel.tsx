'use client';

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { fetchModels } from '@/lib/nim-client';

const DEFAULT_PROMPTS = {
  analysis: `我將提供一部色情小說的內容。請分析以下幾點，確保後續的續寫能保持一致性：\n\n1. 故事背景（時代、地點、社會設定）\n2. 主要角色和他們的關係動態\n3. 目前的故事進展（已發生了什麼）\n4. 敘事風格和語調（文字速度、心理描寫深度、對白特點等）\n5. 故事的核心主題和情欲元素（如權力動態、限制、被動等）\n\n基於以上分析，用 1000-1500 字總結這部小說的核心特徵，為後續的續寫指引提供清晰的基礎。`,
  outline: `【現有小說】\n[插入小說全文]\n\n【故事分析】\n[插入提示詞1的輸出]\n\n---\n\n基於上述內容，為這部小說生成一份續寫大綱。這份大綱應該：\n\n- 字數：5000-8000 字\n- 自然延續現有故事，不強行突轉\n- 保持原有的敘事風格和主題元素\n- 讓角色的行為和心理狀態有邏輯的演變（而非重複或倒退）\n- 在「被限制」「被控制」「無法反抗」等核心主題上有推進或深化\n\n**請放心做你的事。** 不要刻意規劃「3 幕結構」或「必須包含 x y z」。你是編劇和導演，相信你的故事直覺。讓故事自然流動。\n\n輸出時分成 3-4 個清晰的情節段落，每段標註簡短的標題方便後續參考。`,
  breakdown: `【續寫大綱】\n[插入提示詞2的輸出]\n\n---\n\n請將上述大綱分解為 5-7 個章節。每章應該：\n\n- 有清晰的標題\n- 列出該章的 2-3 個關鍵情節點\n- 簡短說明角色心理狀態的變化\n- 提示敘事重心（側重心理、對白、描寫等）\n\n**讓故事自己決定節奏。** 不要擔心「是否足夠戲劇化」或「情節是否夠複雜」——只需讓章節邊界清晰合理。\n\n輸出格式簡潔即可，方便後續參考。`,
  chapter1: `【原始小說】\n[插入原始小說全文]\n\n【故事分析】\n[插入提示詞1的輸出]\n\n【續寫大綱】\n[插入提示詞2的輸出]\n\n【章節框架】\n[插入提示詞3的輸出]\n\n---\n\n請寫第一章。字數目標：4000-5000 字。\n\n**你有充足的上下文，直接開始寫就好。** 不需要我詳細列出「必須包含 a b c」——你看到大綱和框架就知道怎麼展開。保持與原小說相同的風格和速度。\n\n直接輸出小說文本，無需分析或額外說明。`,
  continuation: `【原始小說】\n[插入原始小說全文]\n\n【故事分析】\n[插入提示詞1的輸出]\n\n【續寫大綱】\n[插入提示詞2的輸出]\n\n【章節框架】\n[插入提示詞3的輸出]\n\n【已生成的前面章節】\n[插入前面所有已生成的章節]\n\n---\n\n請寫下一章。字數目標：4000-5000 字。\n\n基於已生成的內容繼續創作，確保：\n- 自然銜接，故事流暢\n- 不重複任何情節、對白或描寫\n- 角色的心理和行為有邏輯進展\n\n直接輸出小說文本，無需分析或額外說明。\n\n**輸入「continue」即可生成下一章。**`
};

export const SettingsPanel: React.FC = () => {
  const { apiKey, selectedModel, recentModels, customPrompts, setApiKey, setSelectedModel, setCustomPrompt, resetPrompt, initialize } = useSettingsStore();
  
  const [localKey, setLocalKey] = useState(apiKey);
  const [localModel, setLocalModel] = useState(selectedModel);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      initialize();
      setLocalKey(apiKey);
      setLocalModel(selectedModel);
    }
  }, [isOpen, apiKey, selectedModel, initialize]);

  const handleSave = async () => {
    await setApiKey(localKey);
    await setSelectedModel(localModel);
    setIsOpen(false);
  };

  const handleFetchModels = async () => {
    setIsLoadingModels(true);
    try {
      // Pass localKey if present, otherwise fetchModels will try to use backend env var
      const models = await fetchModels(localKey);
      setAvailableModels(models.map(m => m.id));
    } catch (error) {
      console.error(error);
      alert('Failed to fetch models. Check API Key or Network.');
    } finally {
      setIsLoadingModels(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>System Configuration</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="prompts">Prompt Engineering</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>NVIDIA NIM API Key</Label>
              <div className="flex gap-2">
                <Input 
                  type="password" 
                  value={localKey} 
                  onChange={(e) => setLocalKey(e.target.value)} 
                  placeholder="nvapi-..."
                />
                <Button variant="outline" onClick={handleFetchModels} disabled={isLoadingModels}>
                  {isLoadingModels ? 'Loading...' : 'Fetch Models'}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Leave blank to use server environment variable (if configured).</p>
            </div>

            <div className="space-y-2">
              <Label>Model Selection</Label>
              <div className="relative">
                <Input 
                  value={localModel} 
                  onChange={(e) => setLocalModel(e.target.value)} 
                  placeholder="Select or type model name..."
                  list="model-history"
                />
                <datalist id="model-history">
                  {availableModels.length > 0 ? (
                    availableModels.map(m => <option key={m} value={m} />)
                  ) : (
                    recentModels.map(m => <option key={m} value={m} />)
                  )}
                </datalist>
              </div>
              <p className="text-xs text-muted-foreground">Type to search or use fetched list.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="prompts" className="space-y-4 py-4">
            <Tabs defaultValue="analysis" orientation="vertical" className="flex gap-4">
              <TabsList className="flex flex-col h-auto bg-transparent gap-2 w-32">
                <TabsTrigger value="analysis" className="w-full justify-start">Analysis</TabsTrigger>
                <TabsTrigger value="outline" className="w-full justify-start">Outline</TabsTrigger>
                <TabsTrigger value="breakdown" className="w-full justify-start">Breakdown</TabsTrigger>
                <TabsTrigger value="chapter1" className="w-full justify-start">Chapter 1</TabsTrigger>
                <TabsTrigger value="continuation" className="w-full justify-start">Continuation</TabsTrigger>
              </TabsList>
              
              <div className="flex-1 space-y-4">
                {Object.entries(DEFAULT_PROMPTS).map(([key, defaultValue]) => (
                  <TabsContent key={key} value={key} className="mt-0">
                    <div className="flex justify-between items-center mb-2">
                      <Label className="capitalize">{key} Prompt Template</Label>
                      <Button variant="ghost" size="sm" onClick={() => resetPrompt(key)}>
                        <RotateCcw className="size-3 mr-1" /> Reset
                      </Button>
                    </div>
                    <Textarea 
                      className="min-h-[300px] font-mono text-xs"
                      value={customPrompts[key] ?? defaultValue}
                      onChange={(e) => setCustomPrompt(key, e.target.value)}
                    />
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={handleSave}>
            <Save className="size-4 mr-2" />
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
