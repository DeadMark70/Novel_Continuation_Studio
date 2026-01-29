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
    -   Preview and word count statistics.
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
    -   History rollback.
    -   Export to TXT (Content only or full log).

## Default Prompts Configuration
The application is built around these 5 specific prompt stages:

### Prompt 1: Novel Analysis
**Purpose:** Analyze core settings and narrative features.
```text
我將提供一部色情小說的內容。請分析以下幾點，確保後續的續寫能保持一致性：

1. 故事背景（時代、地點、社會設定）
2. 主要角色和他們的關係動態
3. 目前的故事進展（已發生了什麼）
4. 敘事風格和語調（文字速度、心理描寫深度、對白特點等）
5. 故事的核心主題和情欲元素（如權力動態、限制、被動等）

基於以上分析，用 1000-1500 字總結這部小說的核心特徵，為後續的續寫指引提供清晰的基礎。
```

### Prompt 2: Outline Generation
**Purpose:** Generate a natural continuation outline based on analysis.
```text
【現有小說】
[插入小說全文]

【故事分析】
[插入提示詞1的輸出]

---

基於上述內容，為這部小說生成一份續寫大綱。這份大綱應該：

- 字數：5000-8000 字
- 自然延續現有故事，不強行突轉
- 保持原有的敘事風格和主題元素
- 讓角色的行為和心理狀態有邏輯的演變（而非重複或倒退）
- 在「被限制」「被控制」「無法反抗」等核心主題上有推進或深化

**請放心做你的事。** 不要刻意規劃「3 幕結構」或「必須包含 x y z」。你是編劇和導演，相信你的故事直覺。讓故事自然流動。

輸出時分成 3-4 個清晰的情節段落，每段標註簡短的標題方便後續參考。
```
*Special Feature:* Users can inject specific "Direction Guidance" here (e.g., "Deepen Conflict").

### Prompt 3: Chapter Breakdown
**Purpose:** Break the outline into a chapter framework.
```text
【續寫大綱】
[插入提示詞2的輸出]

---

請將上述大綱分解為 5-7 個章節。每章應該：

- 有清晰的標題
- 列出該章的 2-3 個關鍵情節點
- 簡短說明角色心理狀態的變化
- 提示敘事重心（側重心理、對白、描寫等）

**讓故事自己決定節奏。** 不要擔心「是否足夠戲劇化」或「情節是否夠複雜」——只需讓章節邊界清晰合理。

輸出格式簡潔即可，方便後續參考。
```

### Prompt 4: Chapter 1 Generation
**Purpose:** Write the first chapter.
```text
【原始小說】
[插入原始小說全文]

【故事分析】
[插入提示詞1的輸出]

【續寫大綱】
[插入提示詞2的輸出]

【章節框架】
[插入提示詞3的輸出]

---

請寫第一章。字數目標：4000-5000 字。

**你有充足的上下文，直接開始寫就好。** 不需要我詳細列出「必須包含 a b c」——你看到大綱和框架就知道怎麼展開。保持與原小說相同的風格和速度。

直接輸出小說文本，無需分析或額外說明。
```

### Prompt 5: Continuation
**Purpose:** Write subsequent chapters.
```text
【原始小說】
[插入原始小說全文]

【故事分析】
[插入提示詞1的輸出]

【續寫大綱】
[插入提示詞2的輸出]

【章節框架】
[插入提示詞3的輸出]

【已生成的前面章節】
[插入前面所有已生成的章節]

---

請寫下一章。字數目標：4000-5000 字。

基於已生成的內容繼續創作，確保：
- 自然銜接，故事流暢
- 不重複任何情節、對白或描寫
- 角色的心理和行為有邏輯進展

直接輸出小說文本，無需分析或額外說明。

**輸入「continue」即可生成下一章。**
```

## Tech Stack
-   **Framework:** React 18+, Next.js (App Router).
-   **Styling:** Tailwind CSS, shadcn/ui.
-   **State Management:** Zustand.
-   **AI Integration:** NVIDIA NIM API (Streaming).
-   **Storage:** LocalStorage & IndexedDB (Dexie.js recommended).
