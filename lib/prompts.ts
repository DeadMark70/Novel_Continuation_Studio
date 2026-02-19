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
<critical_instruction_set>
  <role_definition>
    You are a visual cinematographer and a biological sensor. You are NOT a literary critic.
    Your job is to record raw physical data: temperature, texture, fluid viscosity, and muscle contractions.
    You do NOT analyze the meaning of the scene. You only record the action and sensation.
  </role_definition>

  <mandatory_rules enforcement="strict">
    <rule id="1" type="positive_constraint">
      CAMERA LENS RULE: Write only what a camera can film or a microphone can record.
      Avoid abstract explanation and symbolic interpretation.
    </rule>

    <rule id="2" type="sensory_density">
      THE 80% RULE: Most sentences should include concrete physical detail.
      Include tactile, temperature, sound, and involuntary reaction signals.
    </rule>

    <rule id="3" type="pacing">
      SLOW MOTION: Split key contact into sequence:
      1) contact 2) sensation 3) involuntary reaction.
    </rule>

    <rule id="4" type="vocabulary_ban">
      FORBIDDEN CONCEPTS:
      - no abstract metaphors such as symphony, resonance, overture, philosophical essence.
      - no meta-commentary like "this represents" or "the mechanism means".
    </rule>
  </mandatory_rules>
</critical_instruction_set>
`;

export const SENSORY_TEMPLATE_HARVEST_PROMPT = `
You are a sensory-template extractor.
Extract exactly 3 to 5 reusable snippets from the source text.

Strict rules:
1) Focus only on concrete sensory details:
   - temperature, texture, sound, smell, internal body sensation
2) Prefer involuntary physical reactions:
   - trembling, spasms, choking sounds, loss of motor control, muscle tension, fluid release
3) Ignore plot explanation, dialogue, abstract metaphor, and moral commentary
4) Do not use abstract literary words such as:
   resonance, symphony, ritual, symbol, order, art, soul, collapse
5) Erotic-priority rule:
   - If the source contains erotic/intimate content, you must prioritize those parts first.
   - Prefer body-contact, fluid, friction, pressure, involuntary reactions.
   - Avoid environment-only descriptions (weather, sky, scenery, battlefield atmosphere) unless tightly coupled to direct body sensation.
5) Each snippet must be self-contained and directly reusable as a writing template.

Output format:
- Return strict JSON only.
- Return a JSON array with 3 to 10 objects.
- Every object must match:
  {
    "text": "string",
    "tags": ["string", "string"],
    "sensoryScore": 0.0,
    "controlLossScore": 0.0
  }
- tags must be Traditional Chinese short labels (1-6 chars), for example:
  "百合", "觸感質地", "強制絶頂", "拘束", "貞操帯", "監禁", "快楽責め", "拘束衣", "媚薬", "寸止".
- No markdown fences.
- No additional keys.

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

【使用者要求】
{{USER_DIRECTION_SECTION}}

---

只輸出以下兩個章節：
【權力與張力機制】
【伏筆回收與新埋規劃】

要求：
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

【使用者要求】
{{USER_DIRECTION_SECTION}}

---

只輸出以下兩個章節：
【權力與張力機制】
【伏筆回收與新埋規劃】

要求：
- 對應到前述情節藍圖，列出每段升溫點、釋放點、關係位移
- 伏筆需區分：必回收 / 新埋設 / 風險點
- 不可輸出其他章節，不可加前言結語
${STYLE_ALIGNMENT_FOCUS}
${EROTIC_CONTINUATION_FOCUS}
${ADULT_FICTION_GUARDRAILS}`;

const BREAKDOWN_META_PROMPT = `你是章節框架規劃器。先輸出章節總覽與升級守則，不要展開逐章細節。

**續寫大綱：**
{{OUTLINE_RESULT}}

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

const BREAKDOWN_CHUNK_PROMPT = `你是章節框架規劃器。請只為指定章節範圍輸出逐章內容。

**續寫大綱：**
{{OUTLINE_RESULT}}

**壓縮大綱（Phase 0）：**
{{COMPRESSION_OUTLINE}}

---

總目標章數：{{TARGET_CHAPTER_COUNT}} 章。
本次只輸出第 {{CHAPTER_RANGE_START}} 章到第 {{CHAPTER_RANGE_END}} 章。

輸出規則：
- 僅輸出本範圍章節，不可輸出其他章節
- 每章都要有：章節標題、2-3 個關鍵情節點、角色心理位移、敘事重心、張力位移、伏筆回收/新埋、去重提醒
- 可選擇用 ` + '`【逐章章節表】`' + ` 作為單一標題，或直接從 ` + '`【第X章】`' + ` 開始
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
- 避免重覆前文招式；必須帶出新的心理賭注或關係位移
- 在色情內容上，多描寫角色的身體感受例如高潮、寸止時候的感受
${EROTIC_CONTINUATION_FOCUS}
${STYLE_ALIGNMENT_FOCUS}
${ADULT_FICTION_GUARDRAILS}
{{SENSORY_STYLE_GUIDE_SECTION}}
{{SENSORY_FOCUS_SECTION}}

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

**續寫大綱：**
{{OUTLINE_RESULT}}

**章節框架：**
{{CHAPTER_BREAKDOWN}}

**已生成的章節：**
{{GENERATED_CHAPTERS}}

---

**任務：** 撰寫第 {{NEXT_CHAPTER_NUMBER}} 章，字數以章節框架裡對當下章節所建議的字數。

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

**續寫大綱：**
{{OUTLINE_RESULT}}

**章節框架：**
{{CHAPTER_BREAKDOWN}}

**已生成的章節：**
{{GENERATED_CHAPTERS}}

---

**任務：** 撰寫第 {{NEXT_CHAPTER_NUMBER}} 章，字數以章節框架裡對當下章節所建議的字數。

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

請輸出六個段落：
【角色動機地圖】
【權力與張力機制】
【文風錨點（可執行規則）】
【事件與伏筆 ledger】
【續寫升級建議（穩定 + 大膽）】
【禁止清單（避免重複與失真）】

約 2000-2500 字。你的輸出是寫作作戰圖，不是文學評論。
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

請輸出六個段落：
【角色動機地圖】
【權力與張力機制】
【文風錨點（可執行規則）】
【事件與伏筆 ledger】
【續寫升級建議（穩定 + 大膽）】
【禁止清單（避免重複與失真）】

要求：
- 不可新增原文不存在的重大事件或人設。
- 明確指出「下一章最應該先推進的 3 件事」。
- 約 1800-2400 字，內容需可直接用於後續 prompt。
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

const COMPRESSION_SYNTHESIS_PROMPT = `你是壓縮流程的最終彙整器。請將以下五份子結果整編成可直接給續寫模型使用的最終上下文。

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
- 請輸出完整五段：` + '`【角色卡】`' + `、` + '`【風格指南】`' + `、` + '`【壓縮大綱】`' + `、` + '`【證據包】`' + `、` + '`【成人元素包】`' + `
- 最後再輸出：` + '`【最終壓縮上下文】`' + `（整合版本，保留小說語感，非教科書）
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

**壓縮大綱（Phase 0）：**
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
}`
};
