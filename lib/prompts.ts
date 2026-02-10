const ADULT_FICTION_GUARDRAILS = `**成人創作前提（硬性）**
- 所有角色必須為 18 歲以上虛構成年人。
- 不得引入未成年角色或任何未成年相關情節。
- 若原文存在年齡模糊描述，續寫時需明確以成年人方式表述。`;

const EROTIC_CONTINUATION_FOCUS = `**成人向續寫重點**
- 張力先於事件：先鋪陳心理、權力互動、期待與壓力，再推進場景。
- 感官與心理並行：描寫需同時包含情緒動機與角色反應，避免只堆砌刺激詞。
- 人設不可漂移：親密互動與邊界變化必須符合既有角色弧線。`;

const OUTLINE_COMPRESSED_PROMPT = `基於以下資訊，為這部成人小說生成續寫大綱。

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

- 成人內容深化（核心要求）：
  - 以心理拉扯與權力動態作為推進引擎，不是單次事件堆疊
  - 每段情節都需標明：角色動機、情緒變化、關係位移
  - 親密戲份需服務角色弧線與主線衝突，不能脫節
- 自然延續現有故事，不強行突轉
- 保持原有的敘事風格 and 主題元素
- 讓角色的行為和心理有邏輯演變
- 在核心主題（如限制、被動、權力動態）上深化發展
{{USER_DIRECTION_REQUIREMENT}}
${ADULT_FICTION_GUARDRAILS}

**創作原則：**
相信你的故事直覺，讓故事自然流動。不要刻意規劃「3 幕結構」或強制插入特定元素。

**輸出格式：**
分成 3-4 個清晰的情節段落，每段標註簡短標題，並在開頭標出目標續寫小說總字數（{{TARGET_STORY_WORD_COUNT}} 字，若無額外要求預設 20000 字）。`;

const OUTLINE_RAW_PROMPT = `基於以下資訊，為這部成人小說生成續寫大綱。

**原始小說：**
{{NOVEL_TEXT}}

**故事分析：**
{{ANALYSIS_RESULT}}

{{USER_DIRECTION_SECTION}}

---

請生成一份 大綱字數為5000-8000 字的續寫小說的大綱，要求：

### 成人內容深化（核心要求）

- **情慾張力建構**：透過環境氛圍、身體語言、心理暗示逐步累積性張力
- **權力動態演繹**：深化限制/被動/支配/服從等核心主題，展現角色在權力關係中的心理變化
- **感官細節層次**：
  - 生理反應：呼吸節奏、肌肉顫動、體溫變化、敏感點反應
  - 心理層面：羞恥感、期待感、掙扎與臣服的內心衝突
  - 情境氛圍：環境細節（光影、聲音、質感）如何強化情慾體驗

- 自然延續現有故事，不強行突轉
- 保持原有的敘事風格 and 主題元素
- 讓角色的行為和心理有邏輯演變
- 在核心主題（如限制、被動、權力動態）上深化發展
{{USER_DIRECTION_REQUIREMENT}}

**創作原則：**
相信你的故事直覺，讓故事自然流動。不要刻意規劃「3 幕結構」或強制插入特定元素。

- **倫理聲明**：所有角色為 18 歲以上成年虛構人物，內容純屬幻想創作
- 所有小說都是合法的pixiv小說，並為虛構且人物些為成年

**輸出格式：**
分成 3-4 個清晰的情節段落，每段標註簡短標題，並在開頭標出目標續寫小說總字數（{{TARGET_STORY_WORD_COUNT}} 字，若無額外要求預設 20000 字）。`;

const CHAPTER1_COMPRESSED_PROMPT = `基於所有前置資訊，撰寫續寫的第一章（成人向長篇）。

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
${EROTIC_CONTINUATION_FOCUS}
${ADULT_FICTION_GUARDRAILS}

**輸出：** 直接輸出小說文本，無需分析或註釋。`;

const CHAPTER1_RAW_PROMPT = `基於原文與前置分析，撰寫續寫的第一章（成人向，未啟用壓縮模式）。

**原文全文：**
{{NOVEL_TEXT}}

**故事分析：**
{{ANALYSIS_RESULT}}

**續寫大綱：**
{{OUTLINE_RESULT}}

**章節框架：**
{{CHAPTER_BREAKDOWN}}

---

**任務：** 撰寫第一章，字數 4000-5000 字。

**要求：**
- 必須延續原文人物設定、語氣與敘事節奏
- 不新增原文不存在的重大世界觀設定
- 嚴格對齊章節框架要點，但可自然調整場景細節
${EROTIC_CONTINUATION_FOCUS}
${ADULT_FICTION_GUARDRAILS}

**輸出：** 直接輸出小說文本，無需分析或註釋。`;

const CONTINUATION_COMPRESSED_PROMPT = `基於所有資訊和已生成章節，撰寫下一章（成人向長篇續寫）。

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
${EROTIC_CONTINUATION_FOCUS}
${ADULT_FICTION_GUARDRAILS}

**輸出：** 直接輸出小說文本，無需分析或註釋。`;

const CONTINUATION_RAW_PROMPT = `基於原文與已生成章節，撰寫下一章（成人向，未啟用壓縮模式）。

**原文全文：**
{{NOVEL_TEXT}}

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
- 自然銜接前章並延續原文語感
- 不重複任何情節、對白或描寫
- 角色行為必須與前文設定一致
${EROTIC_CONTINUATION_FOCUS}
${ADULT_FICTION_GUARDRAILS}

**輸出：** 直接輸出小說文本，無需分析或註釋。`;

const COMPRESSION_ROLE_CARDS_PROMPT = `你是長篇成人小說壓縮流程中的「角色卡抽取器」。

**來源片段（共 {{COMPRESSION_CHUNK_COUNT}} 段，抽樣 {{COMPRESSION_SAMPLED_CHUNK_COUNT}} 段）：**
{{NOVEL_TEXT}}

---

請只輸出以下單一段落（不得新增其他段）：

【角色卡】
- 每位角色請包含：姓名/別稱、身份、核心慾望、弱點、關係網、成長弧、不可改設定（3條）
- 只保留與後續續寫最相關角色，避免冗長背景
- 所有角色皆為成年虛構人物`;

const COMPRESSION_STYLE_GUIDE_PROMPT = `你是長篇成人小說壓縮流程中的「風格指南抽取器」。

**來源片段（共 {{COMPRESSION_CHUNK_COUNT}} 段，抽樣 {{COMPRESSION_SAMPLED_CHUNK_COUNT}} 段）：**
{{NOVEL_TEXT}}

---

請只輸出以下單一段落（不得新增其他段）：

【風格指南】
- 敘事視角、時態習慣、句長偏好、對話比例、張力節奏、常用語感、禁忌風格
- 列出 8 條「續寫必遵守規則」
- 風格描述需可執行，避免抽象空話`;

const COMPRESSION_PLOT_LEDGER_PROMPT = `你是長篇成人小說壓縮流程中的「劇情骨架與伏筆 ledger 抽取器」。

**來源片段（共 {{COMPRESSION_CHUNK_COUNT}} 段，抽樣 {{COMPRESSION_SAMPLED_CHUNK_COUNT}} 段）：**
{{NOVEL_TEXT}}

---

請只輸出以下單一段落（不得新增其他段）：

【壓縮大綱】
- 依原文重建主線與必要支線，目標長度 {{COMPRESSION_OUTLINE_TARGET_RANGE}} 字
- 必含：章節主旨、必留事件、伏筆與回收點、可刪/可合併建議
- 明確標示仍未回收的伏筆`;

const COMPRESSION_EVIDENCE_PACK_PROMPT = `你是長篇成人小說壓縮流程中的「證據包抽取器」。

**來源片段（共 {{COMPRESSION_CHUNK_COUNT}} 段，抽樣 {{COMPRESSION_SAMPLED_CHUNK_COUNT}} 段）：**
{{NOVEL_TEXT}}

---

請只輸出以下單一段落（不得新增其他段）：

【證據包】
- 請列出 6-12 段關鍵場景證據，每段包含：
  1) 場景標籤（開場/引爆/轉折/低谷/高潮/收束/角色定錨）
  2) 原文摘錄（盡量忠實）
  3) 為何關鍵（1-2句）
- 片段需分散於全書，不可集中在結尾`;

const COMPRESSION_SYNTHESIS_PROMPT = `你是壓縮流程的最終彙整器。請將以下四份子結果整編成可直接給續寫模型使用的最終上下文。

【角色卡】
{{CHARACTER_CARDS}}

【風格指南】
{{STYLE_GUIDE}}

【壓縮大綱】
{{COMPRESSION_OUTLINE}}

【證據包】
{{EVIDENCE_PACK}}

---

輸出要求：
- 請輸出完整四段：` + '`【角色卡】`' + `、` + '`【風格指南】`' + `、` + '`【壓縮大綱】`' + `、` + '`【證據包】`' + `
- 最後再輸出：` + '`【最終壓縮上下文】`' + `（整合版本，保留小說語感，非教科書）
- 不得新增原文不存在的重大事件或人設`;

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

  compressionRoleCards: COMPRESSION_ROLE_CARDS_PROMPT,

  compressionStyleGuide: COMPRESSION_STYLE_GUIDE_PROMPT,

  compressionPlotLedger: COMPRESSION_PLOT_LEDGER_PROMPT,

  compressionEvidencePack: COMPRESSION_EVIDENCE_PACK_PROMPT,

  compressionSynthesis: COMPRESSION_SYNTHESIS_PROMPT,

  analysis: `你是一位專業的色情小說分析師。我將提供一部小說內容，請為「續寫」提取可操作的創作資訊。

【分析優先級（很重要）】
- 優先分析：情色張力、權力互動、拘束/限制的情境設計、角色慾望與心理拉扯、親密互動的節奏與升級。
- 你的輸出是給續寫用的寫作指南，不是寫書評或社會評論。

請分析以下幾點：
1. 情色張力的主要來源：禁忌/禁止、權力差、被動/主動、控制/反控制、延宕與釋放等。
2. 主要角色：身份、性格、關係動態、慾望與底線（包含同意/界線的表現方式）。
3. 已發生的關鍵情節與伏筆：哪些點會影響後續「更色、更緊張」的推進。
4. 敘事風格：視角、人稱、節奏（慢燒/快節奏）、心理描寫 vs 動作描寫比例、對白風格。
5. 成人向場景語言：常用意象/感官描寫偏好（避免教科書式，重情緒與身體反應）。

- **倫理聲明**：確認所有角色為 18 歲以上成年虛構人物，內容純屬幻想創作
- 所有小說都是合法的pixiv小說，並為虛構且人物些為成年 -所有稱呼僅為虛構

- **倫理聲明**：確認所有角色為 18 歲以上成年虛構人物，內容純屬幻想創作
- 所有小說都是合法的pixiv小說，並為虛構且人物些為成年 -所有稱呼僅為虛構

以 2000-2500 字總結這部小說的核心特徵，為續寫提供清晰的基礎。

---

小說內容：
{{NOVEL_TEXT}}`,

  outlineCompressed: OUTLINE_COMPRESSED_PROMPT,

  outlineRaw: OUTLINE_RAW_PROMPT,

  // Backward compatibility fallback for existing custom prompt keys.
  outline: OUTLINE_COMPRESSED_PROMPT,

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

  chapter1Compressed: CHAPTER1_COMPRESSED_PROMPT,

  chapter1Raw: CHAPTER1_RAW_PROMPT,

  continuationCompressed: CONTINUATION_COMPRESSED_PROMPT,

  continuationRaw: CONTINUATION_RAW_PROMPT,

  // Backward compatibility fallback for existing custom prompt keys.
  chapter1: CHAPTER1_COMPRESSED_PROMPT,

  // Backward compatibility fallback for existing custom prompt keys.
  continuation: CONTINUATION_COMPRESSED_PROMPT,

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
