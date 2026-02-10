export const DEFAULT_PROMPTS = {
  compression: `你是一位長篇小說壓縮編輯。請根據以下小說片段建立可續寫的高保真壓縮上下文。

**來源片段（共 {{COMPRESSION_CHUNK_COUNT}} 段，抽樣 {{COMPRESSION_SAMPLED_CHUNK_COUNT}} 段）：**
{{NOVEL_TEXT}}

---

請嚴格使用以下格式輸出（標題不可改名）：

【角色卡】
- 每位角色包含：姓名/別稱、身份、核心慾望、弱點、關係網、成長弧、不可改設定（3條）

【風格指南】
- 敘事視角、時態習慣、句長偏好、對話比例、張力節奏、常用語感、禁忌風格
- 最後列出 8 條「續寫必遵守規則」

【壓縮大綱】
- 依原文重建主線與必要支線，目標長度 {{COMPRESSION_OUTLINE_TARGET_RANGE}} 字
- 必含：章節主旨、必留事件、伏筆與回收點、可刪/可合併建議

【證據包】
- 請列出 6-12 段關鍵場景證據，每段包含：
  1) 場景標籤（開場/引爆/轉折/低谷/高潮/收束/角色定錨）
  2) 原文摘錄（盡量忠實）
  3) 為何關鍵（1-2句）

【最終壓縮上下文】
- 將角色卡 + 風格指南 + 壓縮大綱 + 證據包合併為可直接給續寫模型的上下文（保留小說語感，不要寫成教科書）。`,

  analysis: `你是一位專業的小說分析師。我將提供一部小說內容，請進行以下分析：

1. 故事背景：時代、地點、社會設定
2. 主要角色：身份、性格、關係動態
3. 故事進展：已發生的關鍵情節與未回收伏筆
4. 敘事風格：文字速度、心理描寫深度、對白特點
5. 核心主題：情欲元素、權力動態、角色的限制或被動狀態

以 1000-1500 字總結這部小說的核心特徵，為續寫提供清晰的基礎。

---
可用上下文（優先壓縮版）：
{{COMPRESSED_CONTEXT}}`,

  outline: `基於以下資訊，為這部成人小說生成續寫大綱。

**壓縮上下文：**
{{COMPRESSED_CONTEXT}}

**角色卡：**
{{CHARACTER_CARDS}}

**風格指南：**
{{STYLE_GUIDE}}

**故事分析：**
{{ANALYSIS_RESULT}}

{{USER_DIRECTION_SECTION}}

---

請生成一份 5000-8000 字的續寫大綱，要求：

- 自然延續現有故事，不強行突轉
- 保持原有的敘事風格 and 主題元素
- 讓角色的行為和心理有邏輯演變
- 在核心主題（如限制、被動、權力動態）上深化發展
{{USER_DIRECTION_REQUIREMENT}}

**創作原則：**
相信你的故事直覺，讓故事自然流動。不要刻意規劃「3 幕結構」或強制插入特定元素。

**輸出格式：**
分成 3-4 個清晰的情節段落，每段標註簡短標題，並在開頭標出目標續寫小說總字數（{{TARGET_STORY_WORD_COUNT}} 字，若無額外要求預設 20000 字）。`,

  breakdown: `將以下大綱分解為 {{TARGET_CHAPTER_COUNT}} 個章節框架，並根據大綱標出的總字數來決定每一章的字數，要在每一章開頭去標出。

**續寫大綱：**
{{OUTLINE_RESULT}}

**壓縮大綱（Phase 0）：**
{{COMPRESSION_OUTLINE}}

---

每個章節需包含：
- 清晰的章節標題
- 2-3 個關鍵情節點
- 角色心理狀態變化的簡短說明
- 敘事重心提示（側重心理/對白/描寫等）

讓故事自己決定節奏，保持章節邊界清晰合理。輸出格式簡潔，便於程式解析。`,

  chapter1: `基於所有前置資訊，撰寫續寫的第一章。

**壓縮上下文：**
{{COMPRESSED_CONTEXT}}

**角色卡：**
{{CHARACTER_CARDS}}

**風格指南：**
{{STYLE_GUIDE}}

**證據包：**
{{EVIDENCE_PACK}}

**故事分析：**
{{ANALYSIS_RESULT}}

**續寫大綱：**
{{OUTLINE_RESULT}}

**章節框架：**
{{CHAPTER_BREAKDOWN}}

---

**任務：** 撰寫第一章，字數 4000-5000 字。

**要求：**
- 你已有充足上下文，直接開始創作
- 保持與原小說相同的風格和節奏
- 自然展開章節框架中的情節點

**輸出：** 直接輸出小說文本，無需分析或註釋。`,

  continuation: `基於所有資訊和已生成的章節，撰寫下一章。

**壓縮上下文：**
{{COMPRESSED_CONTEXT}}

**角色卡：**
{{CHARACTER_CARDS}}

**風格指南：**
{{STYLE_GUIDE}}

**證據包：**
{{EVIDENCE_PACK}}

**故事分析：**
{{ANALYSIS_RESULT}}

**續寫大綱：**
{{OUTLINE_RESULT}}

**章節框架：**
{{CHAPTER_BREAKDOWN}}

**已生成的章節：**
{{GENERATED_CHAPTERS}}

---

**任務：** 撰寫第 {{NEXT_CHAPTER_NUMBER}} 章，字數 4000-5000 字。

**要求：**
- 自然銜接前面的內容
- 不重複任何情節、對白或描寫
- 推進角色的心理和行為發展

**輸出：** 直接輸出小說文本，無需分析或註釋。`,

  consistency: `你是一位小說一致性審校器。請檢查最新章節是否與既有設定衝突，並輸出 JSON（不要輸出其他文字）。

【角色卡】
{{CHARACTER_CARDS}}

【風格指南】
{{STYLE_GUIDE}}

【壓縮大綱】
{{COMPRESSION_OUTLINE}}

【證據包】
{{EVIDENCE_PACK}}

【壓縮上下文】
{{COMPRESSED_CONTEXT}}

【全章列表（含最新章）】
{{ALL_CHAPTERS}}

【最新章節（重點檢查）】
{{LATEST_CHAPTER}}

【既有伏筆 ledger】
{{PREVIOUS_FORESHADOW_LEDGER}}

輸出 JSON schema：
{
  "summary": "一句總結",
  "issues": [
    {
      "category": "character|timeline|naming|foreshadow",
      "severity": "low|medium|high",
      "title": "問題標題",
      "evidence": "原文證據",
      "suggestion": "修正建議"
    }
  ],
  "characterUpdates": [
    {
      "character": "角色名",
      "change": "狀態變化",
      "evidence": "對應證據"
    }
  ],
  "foreshadowUpdates": [
    {
      "title": "伏筆名稱",
      "status": "open|resolved|contradicted",
      "evidence": "對應證據"
    }
  ]
}`
};
