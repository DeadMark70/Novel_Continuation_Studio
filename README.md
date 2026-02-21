# Novel Continuation Studio

> [!CAUTION]
> **Research Prototype — Use at Your Own Risk**
>
> This project is a **personal research prototype** for experimenting with AI-assisted novel writing workflows. It is in an **experimental alpha state** and contains known bugs, stability issues, and unoptimized code paths.
>
> - **Data Loss**: No cloud sync. All data lives in browser IndexedDB. Clearing cache **deletes everything**.
> - **Cost**: Consumes commercial LLM APIs (Claude, GPT-4o, etc.). Monitor your spending.
> - **Support**: No active support or maintenance is provided.
> - **Language**: The internal prompt templates are written in **Traditional Chinese (繁體中文)**. Using English-language novels will likely produce degraded or mixed-language outputs because the system prompts guide the AI in Chinese.

---

> [!CAUTION]
> **研究原型 — 使用風險自負**
>
> 此專案為**個人研究用原型**，用於實驗 AI 輔助小說寫作工作流程。目前處於**實驗性 Alpha 階段**，包含已知 Bug、穩定性問題及未優化的程式碼路徑。
>
> - **資料遺失風險**：無雲端同步。所有資料儲存在瀏覽器 IndexedDB 中，清除快取**將刪除所有小說資料**。
> - **費用**：使用商業 LLM API（Claude、GPT-4o 等），請注意用量與花費。
> - **支援**：不提供任何主動支援或維護。
> - **語言**：內部 Prompt 模板以**繁體中文**撰寫，使用英文小說可能產生品質下降或中英混雜的輸出。

---

## Overview / 概述

**Novel Continuation Studio** is a local-first writing environment that implements **Phase-Based Narrative Generation**. Instead of a single-shot chat prompt, it breaks story continuation into a structured pipeline — from context compression to scene-level drafting.

**Novel Continuation Studio** 是一個本地優先的寫作環境，實現了**階段式敘事生成**。它並非單次對話式生成，而是將故事續寫拆解為結構化的流水線——從上下文壓縮到場景級草稿撰寫。

## Architecture / 架構

### Multi-Phase Generation Pipeline / 多階段生成管線

The system enforces a strict creative pipeline:

系統強制執行嚴格的創作流水線：

```
Compression → Analysis → Outline → Breakdown → Drafting (Chapter 1 / Continuation)
壓縮        → 分析      → 大綱    → 細綱      → 撰寫（首章 / 續寫）
```

| Phase           | Purpose / 用途                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| **Compression** | Consolidates previous chapters into token-efficient summaries / 將先前章節壓縮為高效摘要                   |
| **Analysis**    | Rule-based + LLM consistency checks against character profiles and world rules / 規則 + LLM 雙重一致性檢查 |
| **Outline**     | Generates chapter-level narrative beats / 產生章節級敘事節拍                                               |
| **Breakdown**   | Expands beats into scene-level instructions / 將節拍展開為場景級指令                                       |
| **Drafting**    | Executes final prose generation / 執行最終散文生成                                                         |

### Hybrid AI Engine / 混合 AI 引擎

- **NVIDIA NIM** + **OpenRouter** dual-provider routing
- **Phase Routing**: Each generation phase can be individually assigned to a provider + model
- **Lore Extraction Routing**:
  - `loreExtractor`: primary extraction
  - `loreJsonRepair`: second-pass JSON repair when extraction parse fails

### Key Features / 核心功能

- **Consistency Checker** — A 785-line hybrid engine combining rule-based checks with LLM analysis. Tracks **character timelines** and maintains a **foreshadow ledger** (伏筆追蹤) across chapters.
- **Auto-Mode Control** — Three generation modes:
  - `手動 (Manual)`: Pause after each chapter for review
  - `全自動 (Full Auto)`: Generate all remaining chapters continuously
  - `範圍 (Range)`: Specify a custom chapter range for batch generation
- **Version History** — Per-step version snapshots with comparison and rollback capabilities.
- **Thinking Mode** — Built-in support for reasoning-capable models (e.g., extended thinking). Automatically probes and caches model capability.
- **Run Scheduler** — Queue-based execution engine with abort control and concurrent run management.
- **Streaming** — Real-time Server-Sent Events (SSE) streaming with configurable throttle control.
- **Prompt Engine** — Template-based prompt injection system supporting pacing ratios, dramatic curve control, and structured section contracts.
- **Dynamic Lorebook Studio** — Character/World card management with:
  - extraction target modes (`Single Character`, `Multiple Characters`, `World/Lore`)
  - manual character-list extraction (strict filtering + user-order output)
  - resilient JSON recovery (local repair + optional LLM repair pass)
  - SillyTavern V2/V3 PNG export

## Technical Stack / 技術棧

| Category    | Technology                                                    |
| ----------- | ------------------------------------------------------------- |
| Framework   | [Next.js 16](https://nextjs.org/) (App Router)                |
| Language    | TypeScript / React 19                                         |
| Styling     | TailwindCSS v4                                                |
| State       | `zustand` (Settings, Novel, Workflow, RunScheduler, Lorebook) |
| Persistence | `Dexie.js` (IndexedDB, schema v13) — local-first, no backend  |
| Tokenizer   | Web Worker–based token estimator                              |
| Unit Tests  | `Vitest`                                                      |
| E2E Tests   | `Playwright`                                                  |
| UI Language | Traditional Chinese (繁體中文)                                |

## Project Structure / 專案結構

```
Novel_Continuation_Studio/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/                #   ├── nim/        (NVIDIA NIM proxy)
│   │                       #   └── openrouter/  (OpenRouter proxy)
│   ├── history/            # Reading room & export page
│   ├── lorebook/           # Lorebook studio page
│   └── settings/           # Provider, model, prompt configuration
├── components/
│   ├── lorebook/           # Card editor/list and extraction UI
│   ├── ui/                 # Radix-based design system (Button, Dialog, etc.)
│   └── workflow/           # Pipeline step components & AutoModeControl
├── conductor/              # Orchestration logic & archived iterations
├── hooks/                  # useStepGenerator, useWorkflowOrchestrator, etc.
├── lib/                    # Core logic
│   ├── consistency-checker.ts   # Rule + LLM hybrid consistency engine
│   ├── prompt-engine.ts         # Template injection & pacing control
│   ├── llm-client.ts            # Unified LLM client (streaming, retry)
│   ├── lore-extractor.ts        # Lore extraction + JSON repair pipeline
│   ├── db.ts                    # Dexie.js database schema & operations
│   └── prompts.ts               # Default prompt templates (Chinese)
├── store/                  # Zustand state stores
├── workers/                # Web Worker (tokenizer)
├── __tests__/              # Vitest unit tests
└── e2e/                    # Playwright E2E tests
```

## Getting Started / 快速開始

### Prerequisites / 前置需求

- **Node.js** v20.10.0+
- At least one API key:
  - [OpenRouter](https://openrouter.ai/) (recommended)
  - [NVIDIA NIM](https://build.nvidia.com/explore/discover) (optional)

### Installation / 安裝

```bash
git clone https://github.com/your-username/novel-continuation-studio.git
cd novel-continuation-studio
npm install
```

### Environment / 環境設定

Create `.env.local`:

```bash
# Server-side keys (used by API routes) / 伺服器端金鑰
NIM_API_KEY=nvapi-your-key-here
OPENROUTER_API_KEY=sk-or-your-key-here

# Optional OpenRouter metadata / OpenRouter 額外標頭
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_NAME=NovelContinuationStudio

# Optional client fallback keys (used when Settings is empty) / 前端回退金鑰
NEXT_PUBLIC_NIM_API_KEY=nvapi-your-key-here
NEXT_PUBLIC_OPENROUTER_API_KEY=sk-or-your-key-here
```

### Run / 啟動

```bash
npm run dev
```

Open `http://localhost:3000`.

## Quality Assurance / 品質保證

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Unit tests
npm test

# E2E (install browsers first)
npx playwright install --with-deps chromium
npm run e2e
```

## Known Limitations / 已知限制

| Issue / 問題        | Details / 說明                                                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Browser Storage** | IndexedDB has a quota limit. Large projects with many versions may hit it. / IndexedDB 有容量限制，版本過多可能觸發上限。                                                        |
| **Context Window**  | Very long novels may degrade if compression misses key details. / 極長小說若壓縮遺漏關鍵細節，品質會下降。                                                                       |
| **English Prompts** | System prompts are Chinese-only. English novels produce mixed-language or degraded output. / 系統 Prompt 僅中文，英文小說會產生混語或品質下降的輸出。                            |
| **Mobile**          | Desktop-only UI. Mobile experience is broken. / 僅支援桌面瀏覽器，手機體驗不佳。                                                                                                 |
| **Bugs**            | This is an alpha prototype. Expect occasional UI glitches, edge-case crashes, and iterative error-handling updates. / 此為 Alpha 原型，仍可能出現 UI 問題、邊界情況崩潰與持續迭代中的錯誤處理。 |

---

_Last verified locally on Windows 11 / Node v20.11.0 — 2026-02-21_
