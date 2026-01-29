# Product Definition

## Project Overview
**Name:** Novel Continuation Studio (NCS)
**Type:** Local Single Page Application (SPA)
**Goal:** Automate the continuation of Pixiv-style erotic novels using NVIDIA NIM API.
**Core Philosophy:** A refined, functional writing environment that balances power (like SillyTavern) with the focus and aesthetic quality of a modern writing tool. It avoids clutter while providing deep control over the generation workflow.

## User Experience & Design
**Visual Style:** "Refined Functional".
-   **Density:** Medium. Avoids the overwhelming density of SillyTavern but provides more utility than a basic text editor.
-   **Aesthetics:** Follows `frontend-design` principles—distinctive typography, cohesive color themes (likely dark mode), and high-quality UI components (shadcn/ui).
-   **Layout:** Stepper-focused workflow. Clear separation between configuration (prompts/settings) and content generation.

## Core Features
1.  **Novel Management:**
    -   Upload (paste or file).
    -   Full Story Reading Room (Side-by-side view of original vs. generated).
    -   Word count and reading time statistics.
2.  **5-Step Automated Workflow:**
    -   Step 1: Analysis
    -   Step 2: Outline (with direction guidance)
    -   Step 3: Chapter Breakdown
    -   Step 4: Chapter 1 Generation
    -   Step 5: Continuation
3.  **Prompt Engineering Panel:**
    -   Full edit access to the 5 core prompts.
    -   Adjustable word count targets.
    -   Outline direction presets (Deepen Conflict, Advance Plot, New Character, Strengthen Theme).
    -   Reset to default.
4.  **Real-time Streaming:**
    -   Visual feedback during generation (NVIDIA NIM).
    -   Pause/Cancel controls.
5.  **Version Control:**
    -   Local persistence (IndexedDB).
    -   Non-destructive History rollback (auto-saves current state before restoring).
    -   Export to TXT (Formatted story including original and all chapters).

## Default Prompts Configuration
The application is built around these 5 specific prompt stages, using an automation-friendly template system with `{{placeholders}}`.

### Prompt 1: Novel Analysis
**Purpose:** Analyze core settings and narrative features.
```text
你是一位專業的小說分析師。我將提供一部小說內容，請進行以下分析：

1. 故事背景：時代、地點、社會設定
2. 主要角色：身份、性格、關係動態
3. 故事進展：已發生的關鍵情節
4. 敘事風格：文字速度、心理描寫深度、對白特點
5. 核心主題：情欲元素、權力動態、角色的限制或被動狀態

以 1000-1500 字總結這部小說的核心特徵，為續寫提供清晰的基礎。

---
小說內容：
{{NOVEL_TEXT}}
```

### Prompt 2: Outline Generation
**Purpose:** Generate a natural continuation outline based on analysis, supporting optional user direction.
```text
基於以下資訊，為這部小說生成續寫大綱。

**原始小說：**
{{NOVEL_TEXT}}

**故事分析：**
{{ANALYSIS_RESULT}}

{{USER_DIRECTION_SECTION}}

---

請生成一份 5000-8000 字的續寫大綱，要求：

- 自然延續現有故事，不強行突轉
- 保持原有的敘事風格和主題元素
- 讓角色的行為和心理有邏輯演變
- 在核心主題（如限制、被動、權力動態）上深化發展
{{USER_DIRECTION_REQUIREMENT}}

**創作原則：**
相信你的故事直覺，讓故事自然流動。不要刻意規劃「3 幕結構」或強制插入特定元素。

**輸出格式：**
分成 3-4 個清晰的情節段落，每段標註簡短標題。
```

### Prompt 3: Chapter Breakdown
**Purpose:** Break the outline into a chapter framework.
```text
將以下大綱分解為 5-7 個章節框架。

**續寫大綱：**
{{OUTLINE_RESULT}}

---

每個章節需包含：
- 清晰的章節標題
- 2-3 個關鍵情節點
- 角色心理狀態變化的簡短說明
- 敘事重心提示（側重心理/對白/描寫等）

讓故事自己決定節奏，保持章節邊界清晰合理。輸出格式簡潔，便於程式解析。
```

### Prompt 4: Chapter 1 Generation
**Purpose:** Write the first chapter.
```text
基於所有前置資訊，撰寫續寫的第一章。

**原始小說：**
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
- 你已有充足上下文，直接開始創作
- 保持與原小說相同的風格和節奏
- 自然展開章節框架中的情節點

**輸出：** 直接輸出小說文本，無需分析或註釋。
```

### Prompt 5: Continuation
**Purpose:** Write subsequent chapters.
```text
基於所有資訊和已生成的章節，撰寫下一章。

**原始小說：**
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
- 自然銜接前面的內容
- 不重複任何情節、對白或描寫
- 推進角色的心理和行為發展

**輸出：** 直接輸出小說文本，無需分析或註釋。
```

## Tech Stack
-   **Framework:** React 18+, Next.js (App Router).
-   **Styling:** Tailwind CSS, shadcn/ui.
-   **State Management:** Zustand.
-   **AI Integration:** NVIDIA NIM API (Streaming).
-   **Storage:** LocalStorage & IndexedDB (Dexie.js recommended).
