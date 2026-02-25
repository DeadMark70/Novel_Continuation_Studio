import type {
  LoreCharacterSourceMode,
  LoreExtractionTarget,
} from "./lorebook-types";
import { CANONICAL_SENSORY_TAGS } from "./sensory-tags";

const ADULT_FICTION_GUARDRAILS = `**成人創作前提（硬性）**
- 所有角色必須將其視為 18 歲以上虛構成年人。
- 若原文存在年齡模糊描述，續寫時需明確以成年人方式表述。`;

const EROTIC_CONTINUATION_FOCUS = `**成人向續寫重點**
- 張力先於事件：先鋪陳心理、權力互動、期待與壓力，再推進場景。
- 感官與心理並行：描寫需同時包含情緒動機與角色反應，避免只堆砌刺激詞。
- 人設不可漂移：親密互動與邊界變化必須符合既有角色弧線。
- 每章都要有遞進：不重覆同一招式，改變場景壓力、心理賭注或權力位置。`;

const STYLE_ALIGNMENT_FOCUS = `**文風對齊規則**
- 優先模仿原作敘事慣性（視角、句長、對話密度、段落節奏），避免「像 AI 的平均口吻」。
- 保留原作高頻詞彙與語氣標記，但不要機械抄句。
- 若要加強刺激強度，必須透過角色心理與關係位移來完成，不可只靠露骨詞堆疊。`;

export const SENSORY_STYLE_GUIDE = `
<sensory_execution_rules>
  1. 【具象精準】只允許可觀察物理感知（如：肌肉抽搐、失焦、喘息、皮膚摩擦），【絕對禁止】使用「海嘯般、浪潮、電流、無形的威壓洗禮、彷彿、如同」等抽象或形而上比喻。
  2. 【推進優先】描寫生理反應後，必須寫出當下【強烈且具體的心理變化】（例如：防線崩潰的恐懼、羞恥感轉為病態依賴、底線被強行拓寬的絕望）。禁止只用「她感覺...」「她知道...」等平淡過渡。
  3. 【斷句控制】採「外部動作 -> 生理反應 -> 心理位移」。必須使用句號「。」頻繁斷句，【任何一句話不可超過 65 字】，禁止依賴逗號與破折號不斷句。
  4. 【語言一致】輸出必須為繁體中文，不得混入簡體、英文殘句或中英夾雜口吻。
</sensory_execution_rules>
`;

const SENSORY_TAG_LIST_TEXT = CANONICAL_SENSORY_TAGS.join("、");

export const SENSORY_TEMPLATE_HARVEST_PROMPT =
  `
你是「感官模板提取器（繁體中文）」。
請先在內部完成品質評分，再只輸出 4 條最高品質、可直接複製貼上的感官模板。

硬性規則（全部必須同時滿足）：
1) 每條 text 必須是「單句」，且不超過 65 字。
2) 每條 text 必須符合節奏：外部動作 -> 生理反應 -> 心理位移。
3) 每條 text 嚴禁抽象比喻、價值評論、哲學/形而上語句、宏大場景解說。
4) 每條 text 必須可獨立使用，不可依賴前後文，不可引用「上一章/前文/當時」等上下文指代。
5) 語言必須全繁體中文（JSON 鍵名除外），禁止簡體、英文殘留、拼音與中英混寫。
6) 標籤白名單（CRITICAL）：` +
  "`tags`" +
  ` 只能使用下列字串，禁止自創：
   ${SENSORY_TAG_LIST_TEXT}
7) 必須標示主要感官承受者：
   - ` +
  "`povCharacter`" +
  ` 填角色名，若無明確對象填「通用」。
8) 必須提供 ` +
  "`psychologicalShift`" +
  `，用 8~20 字繁體中文描述該句造成的心理位移（如：羞恥升高、抗拒鬆動、依賴加深）。
9) 分數門檻：
   - ` +
  "`sensoryScore`" +
  ` >= 0.80
   - ` +
  "`controlLossScore`" +
  ` >= 0.75

輸出格式：
- 僅輸出 JSON array，不可輸出 markdown code fence、註解或其他說明文字。
- 固定輸出 4 個元素，元素必須完全符合：
  {
    "text": "string",
    "psychologicalShift": "string",
    "tags": ["string", "string"],
    "povCharacter": "string",
    "sensoryScore": 0.0,
    "controlLossScore": 0.0
  }
- 除上述欄位外禁止新增任何欄位。

Source text:
{{NOVEL_TEXT}}
`;

const OUTLINE_COMPRESSED_PROMPT = `基於以下資訊，為這部成人小說生成續寫大綱。

**壓縮上下文：**
{{COMPRESSED_CONTEXT}}

**角色卡：**
{{CHARACTER_CARDS}}

**風格指南：**
{{STYLE_GUIDE}}

**成人元素包：**
{{EROTIC_PACK}}

**故事分析：**
{{ANALYSIS_RESULT}}

**使用者要求**
{{USER_DIRECTION_SECTION}}

---

請生成一份 8000~11000 字的續寫大綱，要求續寫小說總字數（{{TARGET_STORY_WORD_COUNT}} 字：

- 成人內容深化（核心要求）：
  - 以心理拉扯與權力動態作為推進引擎，不是單次事件堆疊
  - 每段情節都需標明：角色動機、情緒變化、關係位移
  - 親密戲份需服務角色弧線與主線衝突，不能脫節
- 自然延續現有故事，不強行突轉
- 保持原有的敘事風格 and 主題元素
- 讓角色的行為和心理有邏輯演變
- 在核心主題（如限制、被動、權力動態）上深化發展
- 特別注意使用者提出的方向偏好，將其自然融入劇情
**節奏配比（硬性）**
{{PACING_RATIO_SECTION}}

${STYLE_ALIGNMENT_FOCUS}
${ADULT_FICTION_GUARDRAILS}

**創作原則：**
相信你的故事直覺，讓故事自然流動。不要刻意規劃「3 幕結構」或強制插入特定元素。
盡量滿足使用者的要求。

**輸出格式：**
分成 3-4 個清晰的情節段落，每段必含：
- 段落標題
- 本段推進目標（衝突/誘惑/權力互動）
- 角色動機與底線變化
- 必回收伏筆 / 新埋伏筆
- 章節級張力曲線（升溫點與釋放點）
並在開頭標出目標續寫小說總字數（{{TARGET_STORY_WORD_COUNT}} 字，若無額外要求預設 20000 字）。`;

const OUTLINE_RAW_PROMPT = `基於以下資訊，為這部成人小說生成續寫大綱。

**原始小說：**
{{NOVEL_TEXT}}

**故事分析：**
{{ANALYSIS_RESULT}}

**使用者要求**
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
- 特別注意使用者提出的方向偏好，將其自然融入劇情
{{USER_DIRECTION_REQUIREMENT}}

**節奏配比（硬性）**
{{PACING_RATIO_SECTION}}

${STYLE_ALIGNMENT_FOCUS}
${EROTIC_CONTINUATION_FOCUS}

**創作原則：**
相信你的故事直覺，讓故事自然流動。不要刻意規劃「3 幕結構」或強制插入特定元素。
${ADULT_FICTION_GUARDRAILS}

**輸出格式：**
分成 3-4 個清晰的情節段落，每段必含：
- 段落標題
- 本段推進目標（衝突/誘惑/權力互動）
- 角色動機與底線變化
- 必回收伏筆 / 新埋伏筆
- 章節級張力曲線（升溫點與釋放點）
並在開頭標出目標續寫小說總字數（{{TARGET_STORY_WORD_COUNT}} 字，若無額外要求預設 20000 字）。`;

const OUTLINE_PHASE2A_COMPRESSED_PROMPT = `基於以下資訊，生成 Phase 2A（續寫總目標與情節藍圖）。

【壓縮上下文】
{{COMPRESSED_CONTEXT}}

【角色卡】
{{CHARACTER_CARDS}}

【風格指南】
{{STYLE_GUIDE}}

【成人元素包】
{{EROTIC_PACK}}

【故事分析】
{{ANALYSIS_RESULT}}

【使用者要求】
{{USER_DIRECTION_SECTION}}

---

只輸出以下兩個章節：
【續寫總目標與篇幅配置】
【三至四段情節藍圖】

要求：
- CRITICAL: 這是高層骨架，不是草稿。
- 嚴禁輸出對話、內心獨白、完整場景描寫。
- 固定層級：3 個主段；每個主段僅 2-3 個子項。
- 每個子項最多 2 句且不超過 30 字。
- 只描述：劇情推進、角色決策、狀態改變。
- 清楚標出目標續寫小說總字數（{{TARGET_STORY_WORD_COUNT}} 字，預設 20000 字）
- 每段情節藍圖必含：段落標題、推進目標、角色動機位移
- 不可輸出其他章節，不可加前言結語
${STYLE_ALIGNMENT_FOCUS}
${ADULT_FICTION_GUARDRAILS}`;

const OUTLINE_PHASE2A_RAW_PROMPT = `基於以下資訊，生成 Phase 2A（續寫總目標與情節藍圖）。

【原始小說】
{{NOVEL_TEXT}}

【故事分析】
{{ANALYSIS_RESULT}}

【使用者要求】
{{USER_DIRECTION_SECTION}}

---

只輸出以下兩個章節：
【續寫總目標與篇幅配置】
【三至四段情節藍圖】

要求：
- CRITICAL: 這是高層骨架，不是草稿。
- 嚴禁輸出對話、內心獨白、完整場景描寫。
- 固定層級：3 個主段；每個主段僅 2-3 個子項。
- 每個子項最多 2 句且不超過 30 字。
- 只描述：劇情推進、角色決策、狀態改變。
- 清楚標出目標續寫小說總字數（{{TARGET_STORY_WORD_COUNT}} 字，預設 20000 字）
- 每段情節藍圖必含：段落標題、推進目標、角色動機位移
- 不可輸出其他章節，不可加前言結語
${STYLE_ALIGNMENT_FOCUS}
${EROTIC_CONTINUATION_FOCUS}
${ADULT_FICTION_GUARDRAILS}`;

const OUTLINE_PHASE2B_COMPRESSED_PROMPT = `基於以下資訊，生成 Phase 2B（張力機制與伏筆規劃）。

【壓縮上下文】
{{COMPRESSED_CONTEXT}}

【角色卡】
{{CHARACTER_CARDS}}

【風格指南】
{{STYLE_GUIDE}}

【成人元素包】
{{EROTIC_PACK}}

【故事分析】
{{ANALYSIS_RESULT}}

【Phase 2A 既有骨架（唯讀）】
{{OUTLINE_PHASE2A_RESULT}}

【使用者要求】
{{USER_DIRECTION_SECTION}}

---

只輸出以下兩個章節：
【權力與張力機制】
【伏筆回收與新埋規劃】

要求：
- CRITICAL: 這是高層骨架，不是草稿。
- 嚴禁輸出對話、內心獨白、完整場景描寫。
- 固定層級：3 個主段；每個主段僅 2-3 個子項。
- 每個子項最多 2 句且不超過 30 字。
- 只描述：劇情推進、角色決策、狀態改變。
- 對應到前述情節藍圖，列出每段升溫點、釋放點、關係位移
- 伏筆需區分：必回收 / 新埋設 / 風險點
- 不可輸出其他章節，不可加前言結語
${STYLE_ALIGNMENT_FOCUS}
${ADULT_FICTION_GUARDRAILS}`;

const OUTLINE_PHASE2B_RAW_PROMPT = `基於以下資訊，生成 Phase 2B（張力機制與伏筆規劃）。

【原始小說】
{{NOVEL_TEXT}}

【故事分析】
{{ANALYSIS_RESULT}}

【Phase 2A 既有骨架（唯讀）】
{{OUTLINE_PHASE2A_RESULT}}

【使用者要求】
{{USER_DIRECTION_SECTION}}

---

只輸出以下兩個章節：
【權力與張力機制】
【伏筆回收與新埋規劃】

要求：
- CRITICAL: 這是高層骨架，不是草稿。
- 嚴禁輸出對話、內心獨白、完整場景描寫。
- 固定層級：3 個主段；每個主段僅 2-3 個子項。
- 每個子項最多 2 句且不超過 30 字。
- 只描述：劇情推進、角色決策、狀態改變。
- 對應到前述情節藍圖，列出每段升溫點、釋放點、關係位移
- 伏筆需區分：必回收 / 新埋設 / 風險點
- 不可輸出其他章節，不可加前言結語
${STYLE_ALIGNMENT_FOCUS}
${EROTIC_CONTINUATION_FOCUS}
${ADULT_FICTION_GUARDRAILS}`;

const BREAKDOWN_META_PROMPT = `你是章節框架規劃器。先輸出章節總覽與升級守則，不要展開逐章細節。

**續寫大綱（Phase 2A / 2B）：**
【Phase 2A】
{{OUTLINE_PHASE2A_RESULT}}

【Phase 2B】
{{OUTLINE_PHASE2B_RESULT}}

**壓縮大綱（Phase 0）：**
{{COMPRESSION_OUTLINE}}

---

目標章數：{{TARGET_CHAPTER_COUNT}} 章。

只輸出以下兩段（不得新增其他段）：
【章節框架總覽】
- 描述全書章節分布、節奏段落、每章字數配置原則

【張力升級與去重守則】
- 給出跨章升級規則、重複橋段禁止規則、伏筆回收節奏
- 使用可執行條列，不要空泛敘述`;

const BREAKDOWN_CHUNK_PROMPT =
  `你是章節框架規劃器。請只為指定章節範圍輸出逐章內容。

**續寫大綱（Phase 2A / 2B）：**
【Phase 2A】
{{OUTLINE_PHASE2A_RESULT}}

【Phase 2B】
{{OUTLINE_PHASE2B_RESULT}}

**壓縮大綱（Phase 0）：**
{{COMPRESSION_OUTLINE}}

---

總目標章數：{{TARGET_CHAPTER_COUNT}} 章。
本次只輸出第 {{CHAPTER_RANGE_START}} 章到第 {{CHAPTER_RANGE_END}} 章。

輸出規則：
- 僅輸出本範圍章節，不可輸出其他章節
- 每章都要有：章節標題、2-3 個關鍵情節點、角色心理位移、敘事重心、張力位移、伏筆回收/新埋、去重提醒
- 每章新增：` +
  "`【推薦感官標籤】`" +
  `（只能從 ${SENSORY_TAG_LIST_TEXT} 中選 1-3 個，若不需要填「無」）
- 既有標籤候選（優先）：{{EXISTING_SENSORY_TAGS_HINT}}
- 每章新增：` +
  "`【感官視角重心】`" +
  `（填單一角色名；若無明確角色填「通用」）
- 可選擇用 ` +
  "`【逐章章節表】`" +
  ` 作為單一標題，或直接從 ` +
  "`【第X章】`" +
  ` 開始
- 不要輸出前言、結語、說明文字`;

const CHAPTER1_COMPRESSED_PROMPT = `基於所有前置資訊，撰寫續寫的第一章（成人向長篇）。

**壓縮上下文：**
{{COMPRESSED_CONTEXT}}

**角色卡：**
{{CHARACTER_CARDS}}

**風格指南：**
{{STYLE_GUIDE}}

**證據包：**
{{EVIDENCE_PACK}}

**成人元素包：**
{{EROTIC_PACK}}

**故事分析：**
{{ANALYSIS_RESULT}}

**續寫大綱（Phase 2A / 2B）：**
【Phase 2A】
{{OUTLINE_PHASE2A_RESULT}}

【Phase 2B】
{{OUTLINE_PHASE2B_RESULT}}

<chapter_execution_target>
{{CHAPTER_BREAKDOWN}}
</chapter_execution_target>

---
**任務：** 撰寫第一章，目標字數 依照續寫大綱與chapter_execution_target的字數來決定。

<critical_enforcement>
1. 【情節推進最高優先】必須完整走完 <chapter_execution_target> 的所有情節點並在指定字數內結束章節。絕對禁止卡在單一場景反覆描寫。

2. 【句長與節奏鐵律】單句絕對不可超過 58 字（特殊強調句可放寬至 65 字）。每個自然段最多只能出現 1 次破折號。情緒或感官高潮時必須切換成 8~20 字的破碎短句群。

3. 【Sensory 使用原則 - 彈性版】
   Sensory Style Guide 僅作為高優先參考工具，並非每句都要使用。
   當情節自然需要感官細節時才融入，且必須控制在「外部動作 → 生理反應 → 心理位移」三步之內。
   如果當前段落已足夠生動，可完全不使用 Sensory 細節。

4. 【嚴禁維基/說明文風格】
   絕對禁止出現以下詞彙與句型：
   理論上、換句話說、這是、所謂的、例如、事實上、值得注意的是、換而言之、需要說明的是、其本質是…
   禁止用「這件膠衣具有…功能」這類說明句。所有設定必須透過角色感官與動作自然呈現。

5. 【Show don't Tell 鐵律】
   禁止直接告訴讀者「她感到羞恥」「她很痛苦」。必須透過具體動作、身體反應、內心獨白來表現。

6. 【語言純度】全篇使用自然流暢的繁體中文，避免過度華麗或重複形容詞。
</critical_enforcement>

**額外要求：**
- 直接從小說正文開始寫，無需標題、無需任何說明。
- 自然展開章節框架中的情節點。
- 在色情場面中，優先描寫角色的身體真實感受與當下心理變化。
- 每當出現高潮或寸止，必須使用破碎短句。

${EROTIC_CONTINUATION_FOCUS}
${STYLE_ALIGNMENT_FOCUS}
${ADULT_FICTION_GUARDRAILS}
{{SENSORY_STYLE_GUIDE_SECTION}}
{{SENSORY_FOCUS_SECTION}}

**輸出：** 直接輸出小說文本，無需任何註釋或前言。`;

const CHAPTER1_RAW_PROMPT = `基於原文與前置分析，撰寫續寫的第一章（成人向，未啟用壓縮模式）。

**原文全文：**
{{NOVEL_TEXT}}

**故事分析：**
{{ANALYSIS_RESULT}}

**續寫大綱（Phase 2A / 2B）：**
【Phase 2A】
{{OUTLINE_PHASE2A_RESULT}}

【Phase 2B】
{{OUTLINE_PHASE2B_RESULT}}

<chapter_execution_target>
{{CHAPTER_BREAKDOWN}}
</chapter_execution_target>

---

**任務：** 撰寫第一章，字數 4000-5000 字。

<critical_enforcement>
1. 【情節推進鐵律（最高優先級）】你必須在指定字數內，完整覆蓋 <chapter_execution_target> 的章節情節點與結尾邊界。禁止卡在單一場景反覆描寫。
2. 【標點與句長鐵律（致命錯誤）】單句絕對不可超過 65 字，超過必須強制以句號「。」斷句！極度克制使用破折號（——），【每個段落最多只能出現 1 次破折號】，嚴禁用破折號無限串接句子。
3. 【節奏要求】在情緒或感官高潮段落，必須強制切換為 10-20 字的破碎短句群，形成強烈節奏對比。
4. 【語言純度與禁語】全篇使用自然繁體中文。嚴禁使用「海嘯般、浪潮、電流、無形的威壓洗禮、彷彿、如同」等抽象或形而上比喻，只能描寫具體物理感知。
</critical_enforcement>

**要求：**
- 必須延續原文人物設定、語氣與敘事節奏
- 不新增原文不存在的重大世界觀設定
- 嚴格對齊章節框架要點，但可自然調整場景細節
- 避免重覆前文招式；必須帶出新的心理賭注或關係位移
- 在色情內容上，多描寫角色的身體感受例如高潮、寸止時候的感受
${EROTIC_CONTINUATION_FOCUS}
${STYLE_ALIGNMENT_FOCUS}
${ADULT_FICTION_GUARDRAILS}
{{SENSORY_STYLE_GUIDE_SECTION}}
{{SENSORY_FOCUS_SECTION}}

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

**成人元素包：**
{{EROTIC_PACK}}

**故事分析：**
{{ANALYSIS_RESULT}}

**續寫大綱（Phase 2A / 2B）：**
【Phase 2A】
{{OUTLINE_PHASE2A_RESULT}}

【Phase 2B】
{{OUTLINE_PHASE2B_RESULT}}

<chapter_execution_target>
{{CHAPTER_BREAKDOWN}}
</chapter_execution_target>

**已生成的章節：**
{{GENERATED_CHAPTERS}}

---

**任務：** 撰寫第 {{NEXT_CHAPTER_NUMBER}} 章，字數以章節框架裡對當下章節所建議的字數。

<critical_enforcement>
1. 【情節推進鐵律（最高優先級）】你必須在指定字數內，完整覆蓋 <chapter_execution_target> 的章節情節點與結尾邊界。禁止卡在單一場景反覆描寫。
2. 【標點與句長鐵律（致命錯誤）】單句絕對不可超過 65 字，超過必須強制以句號「。」斷句！極度克制使用破折號（——），【每個段落最多只能出現 1 次破折號】，嚴禁用破折號無限串接句子。
3. 【節奏要求】在情緒或感官高潮段落，必須強制切換為 10-20 字的破碎短句群，形成強烈節奏對比。
4. 【語言純度與禁語】全篇使用自然繁體中文。嚴禁使用「海嘯般、浪潮、電流、無形的威壓洗禮、彷彿、如同」等抽象或形而上比喻，只能描寫具體物理感知。
</critical_enforcement>

**要求：**
- 自然銜接前面的內容
- 不重複任何情節、對白或描寫
- 推進角色的心理和行為發展
- 本章必須產生可感知的關係位移，並留下一個可續寫的鉤子
- 在色情內容上，多描寫角色的身體感受例如高潮、寸止時候的感受
${EROTIC_CONTINUATION_FOCUS}
${STYLE_ALIGNMENT_FOCUS}
${ADULT_FICTION_GUARDRAILS}
{{SENSORY_STYLE_GUIDE_SECTION}}
{{SENSORY_FOCUS_SECTION}}

**輸出：** 直接輸出小說文本，無需分析或註釋。`;

const CONTINUATION_RAW_PROMPT = `基於原文與已生成章節，撰寫下一章（成人向，未啟用壓縮模式）。

**原文全文：**
{{NOVEL_TEXT}}

**故事分析：**
{{ANALYSIS_RESULT}}

**續寫大綱（Phase 2A / 2B）：**
【Phase 2A】
{{OUTLINE_PHASE2A_RESULT}}

【Phase 2B】
{{OUTLINE_PHASE2B_RESULT}}

<chapter_execution_target>
{{CHAPTER_BREAKDOWN}}
</chapter_execution_target>

**已生成的章節：**
{{GENERATED_CHAPTERS}}

---

**任務：** 撰寫第 {{NEXT_CHAPTER_NUMBER}} 章，字數以章節框架裡對當下章節所建議的字數。

<critical_enforcement>
1. 【情節推進鐵律（最高優先級）】你必須在指定字數內，完整覆蓋 <chapter_execution_target> 的章節情節點與結尾邊界。禁止卡在單一場景反覆描寫。
2. 【標點與句長鐵律（致命錯誤）】單句絕對不可超過 65 字，超過必須強制以句號「。」斷句！極度克制使用破折號（——），【每個段落最多只能出現 1 次破折號】，嚴禁用破折號無限串接句子。
3. 【節奏要求】在情緒或感官高潮段落，必須強制切換為 10-20 字的破碎短句群，形成強烈節奏對比。
4. 【語言純度與禁語】全篇使用自然繁體中文。嚴禁使用「海嘯般、浪潮、電流、無形的威壓洗禮、彷彿、如同」等抽象或形而上比喻，只能描寫具體物理感知。
</critical_enforcement>

**要求：**
- 自然銜接前章並延續原文語感
- 不重複任何情節、對白或描寫
- 角色行為必須與前文設定一致
- 本章必須產生可感知的關係位移，並留下一個可續寫的鉤子
- 在色情內容上，多描寫角色的身體感受例如高潮、寸止時候的感受
${EROTIC_CONTINUATION_FOCUS}
${STYLE_ALIGNMENT_FOCUS}
${ADULT_FICTION_GUARDRAILS}
{{SENSORY_STYLE_GUIDE_SECTION}}
{{SENSORY_FOCUS_SECTION}}

**輸出：** 直接輸出小說文本，無需分析或註釋。`;

const ANALYSIS_RAW_PROMPT = `你是一位成人向長篇續寫分析師。請從原文抽取「可直接驅動續寫」的資訊，重點是準確延續原作語感與角色關係動態。

【分析優先級（由高到低）】
1. 角色慾望/底線/觸發點/同意邊界
2. 張力來源與權力互動模式（控制/反控制、延宕/釋放）
3. 文風錨點（視角、句長、對話密度、常用語彙、禁忌寫法）
4. 關鍵事件與伏筆 ledger（已回收/未回收/可深化）
5. 續寫風險（最容易寫崩的人設與場景）

輸出格式（標籤名必須完全一致，且只輸出以下兩段）：
<analysis_detail>
【角色動機地圖】
【權力與張力機制】
【文風錨點（可執行規則）】
【事件與伏筆 ledger】
【續寫升級建議（穩定 + 大膽）】
【禁止清單（避免重複與失真）】
</analysis_detail>

<executive_summary>
- 用 8-12 條可執行 bullet，僅保留後續 Phase 2 需要的關鍵決策資訊。
- 每條 bullet 聚焦：情節推進 / 角色決策 / 狀態改變 / 必回收伏筆。
</executive_summary>

analysis_detail 約 2000-2500 字；executive_summary 約 250-350 字。
你的輸出是寫作作戰圖，不是文學評論。
${ADULT_FICTION_GUARDRAILS}

---

小說內容：
{{NOVEL_TEXT}}`;

const ANALYSIS_COMPRESSED_PROMPT = `你是一位成人向長篇續寫分析師。請基於壓縮資訊建立「高可執行」的續寫分析，目標是維持原作感並提高後續章節的張力遞進。

【壓縮上下文】
{{COMPRESSED_CONTEXT}}

【角色卡】
{{CHARACTER_CARDS}}

【風格指南】
{{STYLE_GUIDE}}

【證據包】
{{EVIDENCE_PACK}}

【成人元素包】
{{EROTIC_PACK}}

輸出格式（標籤名必須完全一致，且只輸出以下兩段）：
<analysis_detail>
【角色動機地圖】
【權力與張力機制】
【文風錨點（可執行規則）】
【事件與伏筆 ledger】
【續寫升級建議（穩定 + 大膽）】
【禁止清單（避免重複與失真）】
</analysis_detail>

<executive_summary>
- 用 8-12 條可執行 bullet，僅保留後續 Phase 2 需要的關鍵決策資訊。
- 每條 bullet 聚焦：情節推進 / 角色決策 / 狀態改變 / 必回收伏筆。
</executive_summary>

要求：
- 不可新增原文不存在的重大事件或人設。
- 明確指出「下一章最應該先推進的 3 件事」。
- analysis_detail 約 1800-2400 字；executive_summary 約 250-350 字，內容需可直接用於後續 prompt。
${ADULT_FICTION_GUARDRAILS}`;

const COMPRESSION_ROLE_CARDS_PROMPT = `你是長篇成人小說壓縮流程中的「角色卡抽取器」。

**來源片段（共 {{COMPRESSION_CHUNK_COUNT}} 段，抽樣 {{COMPRESSION_SAMPLED_CHUNK_COUNT}} 段）：**
{{NOVEL_TEXT}}

---

請只輸出以下單一段落（不得新增其他段）：

【角色卡】
- 每位角色請包含：姓名/別稱、身份、核心慾望、弱點、關係網、成長弧、不可改設定（3條）
- 只保留與後續續寫最相關角色，避免冗長背景
- 補充：每位角色需列出「會被什麼情境推高張力」與「絕不可越線點」
- 所有角色皆為成年虛構人物`;

const COMPRESSION_STYLE_GUIDE_PROMPT = `你是長篇成人小說壓縮流程中的「風格指南抽取器」。

**來源片段（共 {{COMPRESSION_CHUNK_COUNT}} 段，抽樣 {{COMPRESSION_SAMPLED_CHUNK_COUNT}} 段）：**
{{NOVEL_TEXT}}

---

請只輸出以下單一段落（不得新增其他段）：

【風格指南】
- 敘事視角、時態習慣、句長偏好、對話比例、張力節奏、常用語感、禁忌風格
- 列出 8 條「續寫必遵守規則」
- 風格描述需可執行，避免抽象空話
- 補充 3 條「禁止出現的 AI 味句型」`;

const COMPRESSION_PLOT_LEDGER_PROMPT = `你是長篇成人小說壓縮流程中的「劇情骨架與伏筆 ledger 抽取器」。

**來源片段（共 {{COMPRESSION_CHUNK_COUNT}} 段，抽樣 {{COMPRESSION_SAMPLED_CHUNK_COUNT}} 段）：**
{{NOVEL_TEXT}}

---

請只輸出以下單一段落（不得新增其他段）：

【壓縮大綱】
- 依原文重建主線與必要支線，目標長度 {{COMPRESSION_OUTLINE_TARGET_RANGE}} 字
- 必含：章節主旨、必留事件、伏筆與回收點、可刪/可合併建議
- 明確標示仍未回收的伏筆
- 每個主節點補一行「若要升級張力，最安全的操作」`;

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
- 片段需分散於全書，不可集中在結尾
- 每段補一行「續寫可沿用元素」`;

const COMPRESSION_EROTIC_PACK_PROMPT = `你是長篇成人小說壓縮流程中的「成人元素包抽取器」。

**來源片段（共 {{COMPRESSION_CHUNK_COUNT}} 段，抽樣 {{COMPRESSION_SAMPLED_CHUNK_COUNT}} 段）：**
{{NOVEL_TEXT}}

---

請只輸出以下單一段落（不得新增其他段）：

【成人元素包】
- 成人主題/類型標籤（最多 8 個）
- 權力互動與張力機制（控制/反控制、延宕/釋放、邊界試探）
- 角色成人側面索引（每角色情慾觸發點、禁忌、可升級路徑）
- 場景模板（升溫 -> 釋放 -> 餘波）與常見轉場信號
- 語感錨點（高頻詞、句法節奏、視角偏好）與禁用句型
- 成人證據片段 6-10 筆（每筆包含：摘錄 + 為何有效 + 可沿用元素）
- 所有角色皆為成年虛構人物，不得引入未成年要素`;

const LORE_EXTRACTION_COMMON_RULES = `你是「Lorebook JSON Extractor」，不是小說創作者。
你的唯一任務是：從輸入文本萃取角色/世界觀卡片，並輸出可機器解析的 JSON。

輸出契約（硬性）：
1. 回傳內容必須是純 JSON，不可包含 markdown code fences，不可包含任何前後說明文字。
2. 回應必須以 \`{\` 或 \`[\` 開頭，並以 \`}\` 或 \`]\` 結尾。
3. 嚴禁使用舊格式 \`{ "cards": [...] }\`。
4. JSON 內字串如需換行，必須使用轉義字元 \`\\n\`。
5. 每筆資料都必須包含：\`type\`, \`name\`, \`description\`, \`personality\`, \`scenario\`, \`first_mes\`, \`mes_example\`。
6. \`mes_example\` 必須包含對話，使用 \`<START>\` 起始，並使用 \`{{user}}\` 與 \`{{char}}\` 巨集。

欄位長度上限（硬性）：
- name <= 80 字元
- description <= 600 字元
- personality <= 300 字元
- scenario <= 400 字元
- first_mes <= 500字元
- mes_example <= 1200 字元
- 若來源過長導致資訊過多，請摘要壓縮內容，不可破壞 JSON 結構。

格式示例（正例）：
{
  "type": "character",
  "name": "Elara",
  "description": "敏捷盜賊，擅長滲透。",
  "personality": "警戒心高但可靠。",
  "scenario": "受雇潛入貴族宅邸。",
  "first_mes": "先別出聲。",
  "mes_example": "<START>\\n{{user}}: 你看到什麼？\\n{{char}}: 守衛在東側巡邏。"
}

禁止示例（反例）：
- 任何「這是你要的結果：」等前言/後記
- \`\`\`json ... \`\`\`
- \`{ "cards": [...] }\`
- JSON 後面再接補充文字`;

const LORE_EXTRACTION_SINGLE_CHARACTER_PROMPT = `${LORE_EXTRACTION_COMMON_RULES}

任務目標：Single Character
- 聚焦單一角色卡。
- 輸出必須是「單一 JSON Object」，不可輸出 Array。
- 若偵測到多名角色，僅輸出最核心的一名。

輸出格式（Object）：
{
  "type": "character",
  "name": "角色名稱",
  "description": "外貌、背景與核心設定",
  "personality": "性格特徵",
  "scenario": "角色目前所處情境",
  "first_mes": "角色第一句開場白",
  "mes_example": "<START>\\n{{user}}: ...\\n{{char}}: ..."
}`;

const LORE_EXTRACTION_MULTIPLE_CHARACTERS_PROMPT = `${LORE_EXTRACTION_COMMON_RULES}

任務目標：Multiple Characters
- 聚焦文本中的多位角色。
- 輸出必須是「JSON Array」格式：[{...}, {...}]。
- 嚴禁回傳單一 Object。
- 最多輸出 3 筆；若可提取超過 3 名，僅保留資訊最完整且最關鍵的 3 名。

輸出格式（Array）：
[
  {
    "type": "character",
    "name": "角色A",
    "description": "...",
    "personality": "...",
    "scenario": "...",
    "first_mes": "...",
    "mes_example": "<START>\\n{{user}}: ...\\n{{char}}: ..."
  }
]`;

const LORE_EXTRACTION_WORLD_LORE_PROMPT = `${LORE_EXTRACTION_COMMON_RULES}

任務目標：World/Lore
- 聚焦世界觀、勢力、地點、規則、歷史背景。
- 輸出以單一世界觀卡為主。
- 輸出必須是「單一 JSON Object」，不可輸出 Array。
- type 應為 "world"。
- 若文本同時包含角色資訊，優先保留世界觀主幹並忽略角色細節。

輸出格式（Object）：
{
  "type": "world",
  "name": "世界觀/勢力/地點名稱",
  "description": "核心世界觀設定",
  "personality": "",
  "scenario": "目前世界狀態與衝突前提",
  "first_mes": "",
  "mes_example": "<START>\\n{{user}}: 請介紹這個世界\\n{{char}}: ..."
}`;

export const LORE_EXTRACTION_PROMPT = LORE_EXTRACTION_SINGLE_CHARACTER_PROMPT;

function buildCharacterScopeInstruction(
  target: LoreExtractionTarget,
  sourceMode?: LoreCharacterSourceMode,
  characterNames?: string[],
): string {
  const normalizedNames = Array.isArray(characterNames)
    ? characterNames
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
    : [];

  if (target === "worldLore") {
    return "";
  }

  if (sourceMode === "manualList" && normalizedNames.length > 0) {
    return [
      "",
      "角色範圍（硬性）:",
      `- 僅允許輸出以下角色：${normalizedNames.join("、")}`,
      "- 不可輸出名單外角色。",
      "- 名稱需盡量與名單一致（保留同一角色的常見別名時，仍以名單名稱為主）。",
      "- 若名單角色未在文本中出現，該角色不要憑空捏造。",
      "- 若任務是 Multiple Characters，輸出順序請盡量依照名單順序。",
    ].join("\n");
  }

  return [
    "",
    "角色範圍:",
    "- 可依文本自動識別主要角色，但避免輸出次要路人角色。",
  ].join("\n");
}

export function getLoreExtractionPrompt(
  target: LoreExtractionTarget,
  options?: {
    sourceMode?: LoreCharacterSourceMode;
    characterNames?: string[];
  },
): string {
  const scopeInstruction = buildCharacterScopeInstruction(
    target,
    options?.sourceMode,
    options?.characterNames,
  );

  if (target === "multipleCharacters") {
    return `${LORE_EXTRACTION_MULTIPLE_CHARACTERS_PROMPT}${scopeInstruction}`;
  }
  if (target === "worldLore") {
    return `${LORE_EXTRACTION_WORLD_LORE_PROMPT}${scopeInstruction}`;
  }
  return `${LORE_EXTRACTION_SINGLE_CHARACTER_PROMPT}${scopeInstruction}`;
}

const LORE_JSON_REPAIR_COMMON_RULES = `你是「Lorebook JSON 修復器」。
你的唯一任務是把「可能壞掉的輸出」修成可被 JSON.parse 成功解析的純 JSON。

硬性規則：
1. 只能輸出 JSON；禁止 markdown、禁止前後說明。
2. 若原文使用全形符號（例如「」『』：，｛｝［］），必須轉為標準 JSON 符號。
3. 所有 key 必須使用英文雙引號包住。
4. 字串內的非法反斜線要修復（例如 "\\ n" -> "\\\\n"）。
5. 欄位名稱統一為：type, name, description, personality, scenario, first_mes, mes_example。
6. 若遇到 _mes / _example，分別映射到 first_mes / mes_example。
7. 嚴禁輸出 { "cards": [...] } 包裝格式。`;

const LORE_JSON_REPAIR_SINGLE_CHARACTER_PROMPT = `${LORE_JSON_REPAIR_COMMON_RULES}

目標：Single Character
- 輸出必須是單一 JSON Object（非 Array）。
- 若輸入含多筆資料，只保留資訊最完整的一筆。`;

const LORE_JSON_REPAIR_MULTIPLE_CHARACTERS_PROMPT = `${LORE_JSON_REPAIR_COMMON_RULES}

目標：Multiple Characters
- 輸出必須是 JSON Array [{...}, {...}]。
- 即使輸入只有單一角色，也要輸出陣列格式。
- 最多保留 3 筆資料。`;

const LORE_JSON_REPAIR_WORLD_LORE_PROMPT = `${LORE_JSON_REPAIR_COMMON_RULES}

目標：World/Lore
- 輸出必須是單一 JSON Object（非 Array）。
- type 必須是 "world"。
- 若輸入混有角色資料，優先保留世界觀主體。`;

export function getLoreJsonRepairPrompt(
  target: LoreExtractionTarget,
  options?: {
    sourceMode?: LoreCharacterSourceMode;
    characterNames?: string[];
  },
): string {
  const scopeInstruction = buildCharacterScopeInstruction(
    target,
    options?.sourceMode,
    options?.characterNames,
  );

  if (target === "multipleCharacters") {
    return `${LORE_JSON_REPAIR_MULTIPLE_CHARACTERS_PROMPT}${scopeInstruction}`;
  }
  if (target === "worldLore") {
    return `${LORE_JSON_REPAIR_WORLD_LORE_PROMPT}${scopeInstruction}`;
  }
  return `${LORE_JSON_REPAIR_SINGLE_CHARACTER_PROMPT}${scopeInstruction}`;
}

const COMPRESSION_SYNTHESIS_PROMPT =
  `你是壓縮流程的最終彙整器。請將以下五份子結果整編成可直接給續寫模型使用的最終上下文。

【角色卡】
{{CHARACTER_CARDS}}

【風格指南】
{{STYLE_GUIDE}}

【壓縮大綱】
{{COMPRESSION_OUTLINE}}

【證據包】
{{EVIDENCE_PACK}}

【成人元素包】
{{EROTIC_PACK}}

---

輸出要求：
- 請輸出完整五段：` +
  "`【角色卡】`" +
  `、` +
  "`【風格指南】`" +
  `、` +
  "`【壓縮大綱】`" +
  `、` +
  "`【證據包】`" +
  `、` +
  "`【成人元素包】`" +
  `
- 最後再輸出：` +
  "`【最終壓縮上下文】`" +
  `（整合版本，保留小說語感，非教科書）
- 不得新增原文不存在的重大事件或人設
- 在最終段落中，明確列出「後續章節不可遺失的 10 個事實錨點」`;

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
- 補充 3 條「禁止出現的 AI 味句型」

【壓縮大綱】
- 依原文重建主線與必要支線，目標長度 {{COMPRESSION_OUTLINE_TARGET_RANGE}} 字
- 必含：章節主旨、必留事件、伏筆與回收點、可刪/可合併建議

【證據包】
- 請列出 6-12 段關鍵場景證據，每段包含：
  1) 場景標籤（開場/引爆/轉折/低谷/高潮/收束/角色定錨）
  2) 原文摘錄（盡量忠實）
  3) 為何關鍵（1-2句）
  4) 續寫可沿用元素（1句）

【成人元素包】
- 成人主題/類型標籤（最多 8 個）
- 權力互動與張力機制（控制/反控制、延宕/釋放、邊界試探）
- 角色成人側面索引（每角色情慾觸發點、禁忌、可升級路徑）
- 場景模板（升溫 -> 釋放 -> 餘波）與常見轉場信號
- 成人證據片段 6-10 筆（每筆包含：摘錄 + 為何有效 + 可沿用元素）

【最終壓縮上下文】
- 將角色卡 + 風格指南 + 壓縮大綱 + 證據包 + 成人元素包合併為可直接給續寫模型的上下文（保留小說語感，不要寫成教科書）。
- 最後加上「不可遺失事實錨點」10 條。`,

  compressionRoleCards: COMPRESSION_ROLE_CARDS_PROMPT,

  compressionStyleGuide: COMPRESSION_STYLE_GUIDE_PROMPT,

  compressionPlotLedger: COMPRESSION_PLOT_LEDGER_PROMPT,

  compressionEvidencePack: COMPRESSION_EVIDENCE_PACK_PROMPT,

  compressionEroticPack: COMPRESSION_EROTIC_PACK_PROMPT,

  compressionSynthesis: COMPRESSION_SYNTHESIS_PROMPT,

  analysisCompressed: ANALYSIS_COMPRESSED_PROMPT,

  analysisRaw: ANALYSIS_RAW_PROMPT,

  // Backward compatibility fallback for existing custom prompt keys.
  analysis: ANALYSIS_COMPRESSED_PROMPT,

  outlineCompressed: OUTLINE_COMPRESSED_PROMPT,

  outlineRaw: OUTLINE_RAW_PROMPT,

  outlinePhase2ACompressed: OUTLINE_PHASE2A_COMPRESSED_PROMPT,

  outlinePhase2ARaw: OUTLINE_PHASE2A_RAW_PROMPT,

  outlinePhase2BCompressed: OUTLINE_PHASE2B_COMPRESSED_PROMPT,

  outlinePhase2BRaw: OUTLINE_PHASE2B_RAW_PROMPT,

  // Backward compatibility fallback for existing custom prompt keys.
  outline: OUTLINE_COMPRESSED_PROMPT,

  breakdownMeta: BREAKDOWN_META_PROMPT,

  breakdownChunk: BREAKDOWN_CHUNK_PROMPT,

  breakdown: `將以下大綱分解為 {{TARGET_CHAPTER_COUNT}} 個章節框架，並根據大綱標出的總字數來決定每一章的字數，要在每一章開頭去標出。

**續寫大綱：**
{{OUTLINE_RESULT}}

**壓縮小說原文（Phase 0）：**
{{COMPRESSION_OUTLINE}}

---

每個章節需包含：
- 清晰的章節標題
- 2-3 個關鍵情節點
- 角色心理狀態變化的簡短說明
- 敘事重心提示（側重心理/對白/描寫等）
- 張力位移（比上一章更緊/更失衡的點）
- 必回收伏筆與新埋伏筆（各至少 1 條）
- 去重提醒：禁止重演前章同型場景與對白節奏

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

【成人元素包】
{{EROTIC_PACK}}

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
      "category": "character|timeline|naming|foreshadow|style_drift|repetition|erotic_drift|erotic_repetition|boundary_mismatch",
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
}`,
};
